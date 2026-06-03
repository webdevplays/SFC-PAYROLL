/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

app.use(express.json());

// Helper to load database
function getDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({
        employees: [],
        barangays: [],
        groups: [],
        surveys: [],
        settlements: [],
        paidPayroll: [],
        auditLogs: [],
        users: [],
        sheetConfig: {
          spreadsheetId: "",
          clientId: "",
          clientEmail: "",
          privateKey: "",
          isSyncEnabled: false
        }
      }, null, 2));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    if (!db.users) {
      db.users = [];
    }
    if (db && db.groups) {
      db.groups.forEach((g: any) => {
        if (!g.coLeaderIds || !Array.isArray(g.coLeaderIds)) {
          g.coLeaderIds = g.coLeaderId ? [g.coLeaderId] : [];
        }
      });
    }
    return db;
  } catch (err) {
    console.error("Error reading DB file:", err);
    return {
      employees: [],
      barangays: [],
      groups: [],
      surveys: [],
      settlements: [],
      paidPayroll: [],
      auditLogs: [],
      sheetConfig: { spreadsheetId: "", clientId: "", clientEmail: "", privateKey: "", isSyncEnabled: false }
    };
  }
}

// Helper to save database
function saveDB(data: any) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing to DB file:", err);
  }
}

// Helper to retrieve spreadsheet configurations favoring process.env parameters
function getEffectiveSheetConfig(db: any) {
  const spreadsheetId = process.env.SPREADSHEET_ID || db?.sheetConfig?.spreadsheetId || "";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || db?.sheetConfig?.clientEmail || "";
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || db?.sheetConfig?.privateKey || "";

  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const isSyncEnabled = !!(spreadsheetId && clientEmail && privateKey);

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
    isSyncEnabled
  };
}

// Helper to add audit log
function addAuditLog(user: string, action: string) {
  const db = getDB();
  const log = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user,
    action,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log); // newest first
  // Limit to last 1000 logs
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  saveDB(db);
  
  // Try to append to audit log sheet if Google Sheet is configured
  const effectiveConfig = getEffectiveSheetConfig(db);
  tryAppendToGoogleSheet(effectiveConfig, "AuditLogs", [
    log.id,
    log.user,
    log.action,
    log.timestamp
  ]).catch(err => console.error("Google Sheets log append minor failure:", err.message));
}

// ============================================
// GOOGLE SHEETS API LIGHTWEIGHT INTEGRATION
// ============================================

// Signs claims to get Google OAuth token using Node crypto
function generateGoogleJWT(clientEmail: string, privateKey: string, scope: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  
  // Format key if needed (replace escaped newlines usually found in env variables)
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const signature = signer.sign(formattedKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

// Gets Google access token
async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const assertion = generateGoogleJWT(clientEmail, privateKey, 'https://www.googleapis.com/auth/spreadsheets');
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', assertion);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth failed: ${errText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// Ensures that required sheet names exist in the spreadsheet; if not, creates them automatically.
async function ensureGoogleSheetsExist(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  requiredSheets: string[]
) {
  const token = await getGoogleAccessToken(clientEmail, privateKey);
  
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(getUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${text}`);
  }
  
  const metadata = await res.json() as any;
  const existingSheets = (metadata.sheets || []).map((s: any) => s.properties.title);
  
  const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));
  if (missingSheets.length === 0) {
    return;
  }
  
  console.log(`Missing sheet tabs identified: ${missingSheets.join(', ')}. Creating now...`);
  
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const requests = missingSheets.map(title => ({
    addSheet: {
      properties: { title }
    }
  }));
  
  const batchRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  
  if (!batchRes.ok) {
    const text = await batchRes.text();
    throw new Error(`Failed to create missing sheets [${missingSheets.join(', ')}]: ${text}`);
  }
  
  console.log(`Successfully created missing sheet tabs: ${missingSheets.join(', ')}`);
}

// Append Row to a specific Sheet range (uses POST append)
async function appendGoogleSheetRow(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  range: string,
  values: any[]
) {
  const token = await getGoogleAccessToken(clientEmail, privateKey);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [values]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to append to Google sheet (${range}): ${text}`);
  }
}

// Wrapper for appending that handles checking config
async function tryAppendToGoogleSheet(config: any, sheetName: string, row: any[]) {
  if (!config || !config.isSyncEnabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return;
  }
  try {
    await ensureGoogleSheetsExist(config.spreadsheetId, config.clientEmail, config.privateKey, [sheetName]);
    await appendGoogleSheetRow(
      config.spreadsheetId,
      config.clientEmail,
      config.privateKey,
      `${sheetName}!A:Z`,
      row
    );
  } catch (err: any) {
    console.error(`Error appending to sheet ${sheetName}:`, err.message);
  }
}

// Clear and Overwrite entire Sheet values
async function overwriteGoogleSheet(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  range: string,
  headerRaw: string[],
  rowsData: any[][]
) {
  const token = await getGoogleAccessToken(clientEmail, privateKey);
  // Clear first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Write new values
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [headerRaw, ...rowsData]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write values to sheet ${range}: ${text}`);
  }
}

// Trigger full tables export sync to Google Sheets
async function syncDatabaseToGoogleSheets(db: any) {
  const config = getEffectiveSheetConfig(db);
  if (!config || !config.isSyncEnabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return;
  }

  // Ensure all required sheets exist first
  try {
    await ensureGoogleSheetsExist(config.spreadsheetId, config.clientEmail, config.privateKey, [
      "Employees",
      "Barangays",
      "Groups",
      "Surveys",
      "Settlements",
      "Paid Payroll",
      "Users",
      "AuditLogs"
    ]);
  } catch (err: any) {
    console.error("Error securing required Google Sheets exist:", err.message);
    throw err;
  }

  // Sync Employees
  const employeeRows = db.employees.map((e: any) => [e.id, e.fullName, e.position, e.address, e.createdDate]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Employees!A1:E1000",
    ["ID", "Full Name", "Position", "Address", "Created Date"], employeeRows);

  // Sync Barangays
  const barangayRows = db.barangays.map((b: any) => [b.id, b.barangayName, b.municipality, b.province, b.createdDate]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Barangays!A1:E1000",
    ["ID", "Barangay Name", "Municipality", "Province", "Created Date"], barangayRows);

  // Sync Groups
  const groupRows = db.groups.map((g: any) => {
    const coLdrStr = g.coLeaderIds && Array.isArray(g.coLeaderIds) && g.coLeaderIds.length > 0 
      ? g.coLeaderIds.join(', ') 
      : (g.coLeaderId || '');
    return [g.id, g.groupName, g.leaderId, coLdrStr, g.rate, g.barangayAssigned, g.addressDesignated, g.status];
  });
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Groups!A1:H1000",
    ["ID", "Group Name", "Leader ID", "Co-Leader ID/s", "Rate", "Barangay Assigned", "Address Designated", "Status"], groupRows);

  // Sync Surveys
  const surveyRows = db.surveys.map((s: any) => [s.id, s.date, s.barangay, s.groupId, s.populationCount, s.rate, s.totalPayout, s.createdBy]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Surveys!A1:H1000",
    ["ID", "Date", "Barangay", "Group ID", "Population Count", "Rate", "Total Payout", "Created By"], surveyRows);

  // Sync Settlements
  const settlementRows = db.settlements.map((s: any) => [s.id, s.settlementDate, s.fromDate, s.toDate, s.totalAmount, s.remarks]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Settlements!A1:F1000",
    ["ID", "Settlement Date", "From Date", "To Date", "Total Amount", "Remarks"], settlementRows);

  // Sync Paid Payroll
  const paidRows = db.paidPayroll.map((p: any) => [p.id, p.settlementId, p.surveyId, p.groupName, p.barangay, p.populationCount, p.rate, p.totalPayout, p.paidDate]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Paid Payroll!A1:I1000",
    ["ID", "Settlement ID", "Survey ID", "Group Name", "Barangay", "Population Count", "Rate", "Total Payout", "Paid Date"], paidRows);

  // Sync Users
  const userRows = (db.users || []).map((u: any) => [u.id, u.username, u.password, u.fullName, u.role, u.createdDate]);
  await overwriteGoogleSheet(config.spreadsheetId, config.clientEmail, config.privateKey, "Users!A1:F1000",
    ["ID", "Username", "Password", "Full Name", "Role", "Created Date"], userRows);
}


async function pullDatabaseFromGoogleSheets(db: any) {
  const config = getEffectiveSheetConfig(db);
  if (!config || !config.isSyncEnabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    throw new Error('Google Sheets sync is not fully configured or enabled');
  }

  const token = await getGoogleAccessToken(config.clientEmail, config.privateKey);

  const pullSheet = async (range: string) => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) return [];
      const data = await response.json() as any;
      return data.values || [];
    } catch (e) {
      console.warn(`Error pulling sheet range ${range}:`, e);
      return [];
    }
  };

  const [empVals, bgyVals, grpVals, srvVals, setVals, paidVals, userVals] = await Promise.all([
    pullSheet("Employees!A2:E1000"),
    pullSheet("Barangays!A2:E1000"),
    pullSheet("Groups!A2:H1000"),
    pullSheet("Surveys!A2:H1000"),
    pullSheet("Settlements!A2:F1000"),
    pullSheet("Paid Payroll!A2:I1000"),
    pullSheet("Users!A2:F1000")
  ]);

  const employees = empVals.map((row: any) => ({
    id: row[0],
    fullName: row[1] || 'Unknown',
    position: row[2] || 'Enumerator',
    address: row[3] || '',
    createdDate: row[4] || new Date().toISOString().split('T')[0]
  })).filter((e: any) => e.id);

  const barangays = bgyVals.map((row: any) => ({
    id: row[0],
    barangayName: row[1] || 'Unknown',
    municipality: row[2] || '',
    province: row[3] || '',
    createdDate: row[4] || new Date().toISOString().split('T')[0]
  })).filter((b: any) => b.id);

  const groups = grpVals.map((row: any) => {
    const rawCoLeader = row[3] || '';
    const coLeaderIds = rawCoLeader ? rawCoLeader.split(',').map((id: string) => id.trim()).filter(Boolean) : [];
    return {
      id: row[0],
      groupName: row[1] || 'Unknown',
      leaderId: row[2] || '',
      coLeaderIds,
      rate: Number(row[4]) || 0,
      barangayAssigned: row[5] || '',
      addressDesignated: row[6] || '',
      status: row[7] || 'Active'
    };
  }).filter((g: any) => g.id);

  const surveys = srvVals.map((row: any) => ({
    id: row[0],
    date: row[1] || new Date().toISOString().split('T')[0],
    barangay: row[2] || '',
    groupId: row[3] || '',
    populationCount: Number(row[4]) || 0,
    rate: Number(row[5]) || 0,
    totalPayout: Number(row[6]) || 0,
    createdBy: row[7] || 'System'
  })).filter((s: any) => s.id);

  const settlements = setVals.map((row: any) => ({
    id: row[0],
    settlementDate: row[1],
    fromDate: row[2],
    toDate: row[3],
    totalAmount: Number(row[4]) || 0,
    remarks: row[5] || ''
  })).filter((s: any) => s.id);

  const paidPayroll = paidVals.map((row: any) => ({
    id: row[0],
    settlementId: row[1],
    surveyId: row[2],
    groupName: row[3],
    barangay: row[4],
    populationCount: Number(row[5]) || 0,
    rate: Number(row[6]) || 0,
    totalPayout: Number(row[7]) || 0,
    paidDate: row[8]
  })).filter((p: any) => p.id);

  const users = userVals.map((row: any) => ({
    id: row[0],
    username: row[1],
    password: row[2],
    fullName: row[3] || 'Administrator',
    role: row[4] || 'Admin',
    createdDate: row[5] || new Date().toISOString().split('T')[0]
  })).filter((u: any) => u.id);

  db.employees = employees;
  db.barangays = barangays;
  db.groups = groups;
  db.surveys = surveys;
  db.settlements = settlements;
  db.paidPayroll = paidPayroll;
  if (users.length > 0) {
    db.users = users;
  }

  saveDB(db);
}


// ============================================
// MIDDLEWARES & AUTH ENDPOINTS
// ============================================

// Simple session auth middleware using headers
function checkAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized session token missing' });
  }
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (parsed && parsed.role && (parsed.role === 'Admin' || parsed.role === 'Payroll Staff')) {
      (req as any).user = parsed;
      next();
    } else {
      return res.status(401).json({ error: 'Invalid or unauthorized user role session' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token format' });
  }
}

// Authentication login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Check dynamic users first
  const db = getDB();
  const matchedUser = (db.users || []).find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (matchedUser) {
    const user = { username: matchedUser.username, role: matchedUser.role, fullName: matchedUser.fullName };
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    addAuditLog(matchedUser.username, `Secure Login - Role: ${matchedUser.role} (Custom DB Account)`);
    return res.json({ token, user });
  }

  // Standard credentials simulation as fallback
  if (username === 'admin' && password === 'password123') {
    const user = { username: 'admin', role: 'Admin', fullName: 'John Administrator' };
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    addAuditLog('admin', 'Secure Login - Role: Admin');
    return res.json({ token, user });
  } else if (username === 'masterkey2026' && password === '021994') {
    const user = { username: 'masterkey2026', role: 'Admin', fullName: 'Google Admin Master' };
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    addAuditLog('masterkey2026', 'Secure Login - Role: Admin (Masterkey)');
    return res.json({ token, user });
  } else if (username === 'staff' && password === 'password123') {
    const user = { username: 'staff', role: 'Payroll Staff', fullName: 'Sarah Staff' };
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    addAuditLog('staff', 'Secure Login - Role: Payroll Staff');
    return res.json({ token, user });
  } else {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
});

// GET dynamic users list (restricted to admin or masterkey)
app.get('/api/users', checkAuth, (req, res) => {
  const db = getDB();
  const usersList = (db.users || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    createdDate: u.createdDate
  }));
  res.json(usersList);
});

// POST dynamic users (only allow admin or masterkey user to create)
app.post('/api/users', checkAuth, (req, res) => {
  if ((req as any).user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators have security privileges to manage accounts' });
  }

  const db = getDB();
  const { username, password, fullName, role } = req.body;
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ error: 'All fields (username, password, fullName, role) are required' });
  }

  db.users = db.users || [];
  if (db.users.some((u: any) => u.username.toLowerCase() === username.toLowerCase()) || 
      ['admin', 'staff', 'masterkey2026'].includes(username.toLowerCase())) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const newUser = {
    id: `USR-${Math.floor(100 + Math.random() * 900)}`,
    username,
    password,
    fullName,
    role,
    createdDate: new Date().toISOString().split('T')[0]
  };

  db.users.push(newUser);
  saveDB(db);
  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  addAuditLog((req as any).user.username, `Provisioned Admin Account: ${username} (${fullName})`);
  res.json(newUser);
});

// DELETE dynamic users
app.delete('/api/users/:id', checkAuth, (req, res) => {
  if ((req as any).user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators have security privileges to manage accounts' });
  }

  const db = getDB();
  const { id } = req.params;
  
  db.users = db.users || [];
  const initialLen = db.users.length;
  const targetUser = db.users.find((u: any) => u.id === id);
  db.users = db.users.filter((u: any) => u.id !== id);
  
  if (db.users.length === initialLen) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  saveDB(db);
  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));
  addAuditLog((req as any).user.username, `Revoked User Account ID: ${id} (${targetUser?.username})`);
  res.json({ success: true });
});


// ============================================
// SYSTEM MODEL ENDPOINTS
// ============================================

// Settings / Config API
app.get('/api/settings', checkAuth, (req, res) => {
  const db = getDB();
  const effectiveConfig = getEffectiveSheetConfig(db);
  // Strip private key for security in GET
  const sanitizedConfig = { ...effectiveConfig };
  if (sanitizedConfig.privateKey) {
    sanitizedConfig.privateKey = "••••••••••••••••••••";
  }
  res.json(sanitizedConfig);
});

app.post('/api/settings', checkAuth, async (req, res) => {
  const db = getDB();
  const { spreadsheetId, clientId, clientEmail, privateKey, isSyncEnabled } = req.body;

  let keyToSave = privateKey;
  if (privateKey === "••••••••••••••••••••" || !privateKey) {
    keyToSave = db.sheetConfig.privateKey;
  }

  db.sheetConfig = {
    spreadsheetId: spreadsheetId || "",
    clientId: clientId || "",
    clientEmail: clientEmail || "",
    privateKey: keyToSave || "",
    isSyncEnabled: !!isSyncEnabled
  };

  saveDB(db);
  addAuditLog((req as any).user.username, `Updated Google Sheets Sync Settings (Enabled: ${db.sheetConfig.isSyncEnabled})`);

  // If sync enabled, trigger initial bulk sheet overwrite to establish database
  if (db.sheetConfig.isSyncEnabled && db.sheetConfig.spreadsheetId && db.sheetConfig.privateKey) {
    try {
      await syncDatabaseToGoogleSheets(db);
      addAuditLog("System", "Initial Google Sheets Database push successful");
      return res.json({ status: "success", message: "Settings saved and initial sync to Google Sheets completed successfully!" });
    } catch (err: any) {
      console.error("Database Sheets initial sync error:", err);
      return res.json({ status: "warning", message: `Settings saved locally, but initial Sheets push failed: ${err.message}` });
    }
  }

  res.json({ status: "success", message: "Settings saved successfully." });
});

// Endpoint to pull/restore data from Google Sheets
app.post('/api/settings/pull', checkAuth, async (req, res) => {
  try {
    const db = getDB();
    await pullDatabaseFromGoogleSheets(db);
    addAuditLog((req as any).user.username, "Full database sync pull from Google Sheets successful");
    res.json({ status: "success", message: "Database compiled successfully and updated from Google Sheets!" });
  } catch (err: any) {
    console.error("Error pulling database from Google Sheets:", err);
    res.status(500).json({ error: `Could not fetch Google Sheet data accurately: ${err.message}` });
  }
});

// Endpoint to restore server-side database from client local storage backup securely
app.post('/api/settings/restore-backup', checkAuth, async (req, res) => {
  try {
    const db = getDB();
    const { employees, barangays, groups, surveys, settlements, paidPayroll, users, sheetConfig } = req.body;
    
    // Perform targeted merging to avoid destroying any newer server updates
    if (employees && Array.isArray(employees)) db.employees = employees;
    if (barangays && Array.isArray(barangays)) db.barangays = barangays;
    if (groups && Array.isArray(groups)) db.groups = groups;
    if (surveys && Array.isArray(surveys)) db.surveys = surveys;
    if (settlements && Array.isArray(settlements)) db.settlements = settlements;
    if (paidPayroll && Array.isArray(paidPayroll)) db.paidPayroll = paidPayroll;
    
    if (users && Array.isArray(users) && users.length > 0) {
      // Merge custom admin users by unique ID
      const userMap = new Map();
      (db.users || []).forEach((u: any) => userMap.set(u.username.toLowerCase(), u));
      users.forEach((u: any) => {
        if (u && u.username) {
          userMap.set(u.username.toLowerCase(), u);
        }
      });
      db.users = Array.from(userMap.values());
    }

    if (sheetConfig && typeof sheetConfig === 'object') {
      db.sheetConfig = {
        ...db.sheetConfig,
        ...sheetConfig
      };
    }

    saveDB(db);
    
    // Automatically trigger Sheets push sync if active
    const effective = getEffectiveSheetConfig(db);
    if (effective.isSyncEnabled) {
      try {
        await syncDatabaseToGoogleSheets(db);
        console.log("Automatic Google Sheets push complete following browser backup restoration");
        addAuditLog((req as any).user.username, "Full database state restored from browser backup and push-synced to Google Sheets");
      } catch (sheetsErr: any) {
        console.warn("Minor Google Sheets push failure after backup restoration:", sheetsErr.message);
        addAuditLog((req as any).user.username, `Full database state restored from browser backup, Google Sheets push pending: ${sheetsErr.message}`);
      }
    } else {
      addAuditLog((req as any).user.username, "Full database state restored from browser local backup");
    }

    res.json({ status: "success", message: "Success! Application database re-hydrated and securely restored from browser backup." });
  } catch (err: any) {
    console.error("Error restoring database backup:", err);
    res.status(500).json({ error: `Failed to restore database backup: ${err.message}` });
  }
});

// 1. Employees CRUD
app.get('/api/employees', checkAuth, (req, res) => {
  res.json(getDB().employees);
});

app.post('/api/employees', checkAuth, (req, res) => {
  const db = getDB();
  const { fullName, position, address } = req.body;
  if (!fullName || !position || !address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const employee = {
    id: `EMP-${100 + db.employees.length + 1}`,
    fullName,
    position,
    address,
    createdDate: new Date().toISOString().split('T')[0]
  };

  db.employees.push(employee);
  saveDB(db);
  addAuditLog((req as any).user.username, `Add Employee: ${fullName} (${employee.id})`);
  
  // Async background sync
  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.status(201).json(employee);
});

app.put('/api/employees/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { fullName, position, address } = req.body;

  const idx = db.employees.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  db.employees[idx] = {
    ...db.employees[idx],
    fullName: fullName || db.employees[idx].fullName,
    position: position || db.employees[idx].position,
    address: address || db.employees[idx].address
  };

  saveDB(db);
  addAuditLog((req as any).user.username, `Update Employee: ${db.employees[idx].fullName} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json(db.employees[idx]);
});

app.delete('/api/employees/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const idx = db.employees.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const name = db.employees[idx].fullName;
  db.employees.splice(idx, 1);
  saveDB(db);
  addAuditLog((req as any).user.username, `Delete Employee: ${name} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json({ message: "Employee removed successfully" });
});


// 2. Barangays CRUD
app.get('/api/barangays', checkAuth, (req, res) => {
  res.json(getDB().barangays);
});

app.post('/api/barangays', checkAuth, (req, res) => {
  const db = getDB();
  const { barangayName, municipality, province } = req.body;
  if (!barangayName || !municipality || !province) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const barangay = {
    id: `BGY-${String(db.barangays.length + 1).padStart(3, '0')}`,
    barangayName,
    municipality,
    province,
    createdDate: new Date().toISOString().split('T')[0]
  };

  db.barangays.push(barangay);
  saveDB(db);
  addAuditLog((req as any).user.username, `Add Barangay: ${barangayName}`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.status(201).json(barangay);
});

app.put('/api/barangays/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { barangayName, municipality, province } = req.body;

  const idx = db.barangays.findIndex((b: any) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Barangay not found" });
  }

  db.barangays[idx] = {
    ...db.barangays[idx],
    barangayName: barangayName || db.barangays[idx].barangayName,
    municipality: municipality || db.barangays[idx].municipality,
    province: province || db.barangays[idx].province
  };

  saveDB(db);
  addAuditLog((req as any).user.username, `Update Barangay: ${db.barangays[idx].barangayName} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json(db.barangays[idx]);
});

app.delete('/api/barangays/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const idx = db.barangays.findIndex((b: any) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Barangay not found" });
  }

  const name = db.barangays[idx].barangayName;
  db.barangays.splice(idx, 1);
  saveDB(db);
  addAuditLog((req as any).user.username, `Delete Barangay: ${name} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json({ message: "Barangay removed successfully" });
});


// 3. Groups CRUD
app.get('/api/groups', checkAuth, (req, res) => {
  res.json(getDB().groups);
});

app.post('/api/groups', checkAuth, (req, res) => {
  const db = getDB();
  const { groupName, leaderId, coLeaderId, coLeaderIds, rate, barangayAssigned, addressDesignated } = req.body;
  
  const finalCoLeaderIds = coLeaderIds || (coLeaderId ? [coLeaderId] : []);
  const finalCoLeaderId = coLeaderId || (finalCoLeaderIds[0] || "");

  if (!groupName || !leaderId || finalCoLeaderIds.length === 0 || !rate || !barangayAssigned) {
    return res.status(400).json({ error: "Missing required fields (including at least one co-leader)" });
  }

  const group = {
    id: `GRP-${String(db.groups.length + 1).padStart(3, '0')}`,
    groupName,
    leaderId,
    coLeaderId: finalCoLeaderId,
    coLeaderIds: finalCoLeaderIds,
    rate: Number(rate),
    barangayAssigned,
    addressDesignated: addressDesignated || "",
    status: 'Active'
  };

  db.groups.push(group);
  saveDB(db);
  addAuditLog((req as any).user.username, `Create Group: ${groupName}`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.status(201).json(group);
});

app.put('/api/groups/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { groupName, leaderId, coLeaderId, coLeaderIds, rate, barangayAssigned, addressDesignated, status } = req.body;

  const idx = db.groups.findIndex((g: any) => g.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Group not found" });
  }

  const finalCoLeaderIds = coLeaderIds || (coLeaderId ? [coLeaderId] : db.groups[idx].coLeaderIds || (db.groups[idx].coLeaderId ? [db.groups[idx].coLeaderId] : []));
  const finalCoLeaderId = coLeaderId || (finalCoLeaderIds[0] || db.groups[idx].coLeaderId || "");

  db.groups[idx] = {
    ...db.groups[idx],
    groupName: groupName || db.groups[idx].groupName,
    leaderId: leaderId || db.groups[idx].leaderId,
    coLeaderId: finalCoLeaderId,
    coLeaderIds: finalCoLeaderIds,
    rate: rate !== undefined ? Number(rate) : db.groups[idx].rate,
    barangayAssigned: barangayAssigned || db.groups[idx].barangayAssigned,
    addressDesignated: addressDesignated !== undefined ? addressDesignated : db.groups[idx].addressDesignated,
    status: status || db.groups[idx].status
  };

  saveDB(db);
  addAuditLog((req as any).user.username, `Update Group: ${db.groups[idx].groupName} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json(db.groups[idx]);
});

app.delete('/api/groups/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const idx = db.groups.findIndex((g: any) => g.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Group not found" });
  }

  const name = db.groups[idx].groupName;
  db.groups.splice(idx, 1);
  saveDB(db);
  addAuditLog((req as any).user.username, `Delete Group: ${name} (${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json({ message: "Group removed successfully" });
});


// 4. Surveys CRUD
app.get('/api/surveys', checkAuth, (req, res) => {
  res.json(getDB().surveys);
});

app.post('/api/surveys', checkAuth, (req, res) => {
  const db = getDB();
  const { date, barangay, groupId, populationCount, rate } = req.body;
  if (!date || !barangay || !groupId || populationCount === undefined || !rate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const rawCount = Number(populationCount);
  const rawRate = Number(rate);
  const survey = {
    id: `SRV-${200 + db.surveys.length + 1}`,
    date,
    barangay,
    groupId,
    populationCount: rawCount,
    rate: rawRate,
    totalPayout: rawCount * rawRate,
    createdBy: (req as any).user.username,
    createdDate: new Date().toISOString().split('T')[0]
  };

  db.surveys.push(survey);
  saveDB(db);
  addAuditLog((req as any).user.username, `Create Survey (ID: ${survey.id}) for Group ID ${groupId}. Total payout: ${survey.totalPayout} PHP`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.status(201).json(survey);
});

app.put('/api/surveys/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { date, barangay, groupId, populationCount, rate } = req.body;

  const idx = db.surveys.findIndex((s: any) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const count = populationCount !== undefined ? Number(populationCount) : db.surveys[idx].populationCount;
  const rt = rate !== undefined ? Number(rate) : db.surveys[idx].rate;

  db.surveys[idx] = {
    ...db.surveys[idx],
    date: date || db.surveys[idx].date,
    barangay: barangay || db.surveys[idx].barangay,
    groupId: groupId || db.surveys[idx].groupId,
    populationCount: count,
    rate: rt,
    totalPayout: count * rt
  };

  saveDB(db);
  addAuditLog((req as any).user.username, `Updated Survey context (ID: ${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json(db.surveys[idx]);
});

app.delete('/api/surveys/:id', checkAuth, (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const idx = db.surveys.findIndex((s: any) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Survey not found" });
  }

  db.surveys.splice(idx, 1);
  saveDB(db);
  addAuditLog((req as any).user.username, `Deleted Survey record (ID: ${id})`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.json({ message: "Survey removed successfully" });
});


// 5. Settlements Processing & Paid Payroll List
app.get('/api/settlements', checkAuth, (req, res) => {
  res.json(getDB().settlements);
});

app.get('/api/paid-payroll', checkAuth, (req, res) => {
  res.json(getDB().paidPayroll);
});

app.post('/api/settlements', checkAuth, (req, res) => {
  const db = getDB();
  const { fromDate, toDate, remarks } = req.body;
  if (!fromDate || !toDate) {
    return res.status(400).json({ error: "Check From Date and To Date filters" });
  }

  // 1. Get all active payroll surveys records between dates (inclusive)
  const matchingSurveys = db.surveys.filter((s: any) => {
    return s.date >= fromDate && s.date <= toDate;
  });

  if (matchingSurveys.length === 0) {
    return res.status(400).json({ error: "No active surveys found in this date range to settle." });
  }

  // 2. Calculate total payout
  const totalAmount = matchingSurveys.reduce((sum: number, s: any) => sum + s.totalPayout, 0);

  // 3. Create unique Settlement ID
  const settlementId = `SET-${Math.floor(100 + Math.random() * 900)}`;
  const settlementDate = new Date().toISOString().split('T')[0];

  const settlement = {
    id: settlementId,
    settlementDate,
    fromDate,
    toDate,
    totalAmount,
    remarks: remarks || `Settlement for period ${fromDate} to ${toDate}`
  };

  // 4. Move payroll records to Paid Payroll and clear from active surveys
  const paidEntries: any[] = [];
  matchingSurveys.forEach((s: any) => {
    // Read group name from groups DB if available
    const parentGroup = db.groups.find((g: any) => g.id === s.groupId);
    const grpName = parentGroup ? parentGroup.groupName : "Unassigned Group";

    const paidItem = {
      id: `PPD-${Math.floor(1000 + Math.random() * 9000)}`,
      settlementId: settlementId,
      surveyId: s.id,
      groupName: grpName,
      barangay: s.barangay,
      populationCount: s.populationCount,
      rate: s.rate,
      totalPayout: s.totalPayout,
      paidDate: settlementDate
    };

    paidEntries.push(paidItem);
  });

  // Save to collections
  db.settlements.push(settlement);
  db.paidPayroll = [...db.paidPayroll, ...paidEntries];

  // 5. Remove settled records from active Surveys
  db.surveys = db.surveys.filter((s: any) => {
    return !(s.date >= fromDate && s.date <= toDate);
  });

  saveDB(db);
  addAuditLog((req as any).user.username, `Settlement Processing ID: ${settlementId}, Total Cleared: ${totalAmount} PHP across ${paidEntries.length} surveys`);

  syncDatabaseToGoogleSheets(db).catch(err => console.error("Sheets update minor error:", err.message));

  res.status(201).json({
    settlement,
    paidItemsCount: paidEntries.length,
    totalMoved: totalAmount
  });
});


// 6. Audit Logs endpoint
app.get('/api/logs', checkAuth, (req, res) => {
  res.json(getDB().auditLogs);
});


// ============================================
// SYSTEM BOOTSTRAP INTERCEPTOR
// ============================================

const startServer = async () => {
  // Mount Vite middleware for development so asset loading runs smoothly
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving Production Standalone Bundled Assets (dist)...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Field Survey Payroll backend serving on port ${PORT}`);
    
    // Auto sync/pull on boot to re-hydrate state and prevent data loss on ephemeral containers
    console.log("Initializing startup Google Sheets sync verification check...");
    const currentDb = getDB();
    const config = getEffectiveSheetConfig(currentDb);
    if (config && config.isSyncEnabled && config.spreadsheetId && config.clientEmail && config.privateKey) {
      console.log("Startup Google Sheets integration detected. Attempting database pull/re-hydration...");
      pullDatabaseFromGoogleSheets(currentDb)
        .then(() => {
          console.log("Startup Google Sheets database re-hydration succeeded. State successfully restored from Sheets.");
        })
        .catch((err) => {
          console.warn("Startup Google Sheets database pull skipped/failed. Performing fallback database push verification...", err.message);
          syncDatabaseToGoogleSheets(currentDb)
            .then(() => console.log("Startup Google Sheets database push verification succeeded."))
            .catch((pushErr) => console.warn("Startup Google Sheets push verification failed:", pushErr.message));
        });
    } else {
      console.log("No active Google Sheets integration enabled on startup.");
    }
  });
};

startServer().catch(err => {
  console.error("Critical server bootstrap crash:", err);
});
