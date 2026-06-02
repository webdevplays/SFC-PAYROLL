/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = window.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64UrlEncode(bytes.buffer);
}

async function signJWTWithWebCrypto(clientEmail: string, privateKeyPEM: string, scope: string): Promise<string> {
  let normalizedKey = privateKeyPEM;
  if (normalizedKey.startsWith('"') && normalizedKey.endsWith('"')) {
    normalizedKey = normalizedKey.slice(1, -1);
  }
  normalizedKey = normalizedKey.replace(/\\n/g, '\n');

  const keyBuffer = pemToArrayBuffer(normalizedKey);
  const cryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const headerEncoded = stringToBase64Url(JSON.stringify(header));
  const payloadEncoded = stringToBase64Url(JSON.stringify(payload));
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

  const signatureBuffer = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureEncoded = base64UrlEncode(signatureBuffer);
  return `${unsignedToken}.${signatureEncoded}`;
}

async function getGoogleAccessTokenClient(clientEmail: string, privateKeyPEM: string): Promise<string> {
  const assertion = await signJWTWithWebCrypto(clientEmail, privateKeyPEM, 'https://www.googleapis.com/auth/spreadsheets');
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
    throw new Error(`Google OAuth failed client-side: ${errText}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function ensureGoogleSheetsExistClient(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  requiredSheets: string[]
) {
  const token = await getGoogleAccessTokenClient(clientEmail, privateKey);
  
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
  
  console.log(`[Client Sync] Missing sheet tabs: ${missingSheets.join(', ')}. Creating...`);
  
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
    throw new Error(`Failed to create missing sheets client-side: ${text}`);
  }
}

async function overwriteGoogleSheetClient(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  range: string,
  headerRaw: string[],
  rowsData: any[][]
) {
  const token = await getGoogleAccessTokenClient(clientEmail, privateKey);
  
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

async function appendGoogleSheetRowClient(
  spreadsheetId: string,
  clientEmail: string,
  privateKey: string,
  range: string,
  values: any[]
) {
  const token = await getGoogleAccessTokenClient(clientEmail, privateKey);
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
    throw new Error(`Failed to append row client-side (${range}): ${text}`);
  }
}

export async function syncDatabaseToGoogleSheetsClient(db: any, config: any) {
  if (!config || !config.isSyncEnabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    console.warn("[Client Sync] Google sheets sync skipped: missing config details.");
    return;
  }

  try {
    // Ensure sheets exist
    await ensureGoogleSheetsExistClient(config.spreadsheetId, config.clientEmail, config.privateKey, [
      "Employees",
      "Barangays",
      "Groups",
      "Surveys",
      "Settlements",
      "Paid Payroll",
      "AuditLogs"
    ]);

    // Sync Employees
    const employeeRows = (db.employees || []).map((e: any) => [e.id, e.fullName, e.position, e.address, e.createdDate]);
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Employees!A1:E1000",
      ["ID", "Full Name", "Position", "Address", "Created Date"], employeeRows);

    // Sync Barangays
    const barangayRows = (db.barangays || []).map((b: any) => [b.id, b.barangayName, b.municipality, b.province, b.createdDate]);
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Barangays!A1:E1000",
      ["ID", "Barangay Name", "Municipality", "Province", "Created Date"], barangayRows);

    // Sync Groups
    const groupRows = (db.groups || []).map((g: any) => {
      const coLdrStr = g.coLeaderIds && Array.isArray(g.coLeaderIds) && g.coLeaderIds.length > 0 
        ? g.coLeaderIds.join(', ') 
        : (g.coLeaderId || '');
      return [g.id, g.groupName, g.leaderId, coLdrStr, g.rate, g.barangayAssigned, g.addressDesignated, g.status];
    });
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Groups!A1:H1000",
      ["ID", "Group Name", "Leader ID", "Co-Leader ID/s", "Rate", "Barangay Assigned", "Address Designated", "Status"], groupRows);

    // Sync Surveys
    const surveyRows = (db.surveys || []).map((s: any) => [s.id, s.date, s.barangay, s.groupId, s.populationCount, s.rate, s.totalPayout, s.createdBy]);
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Surveys!A1:H1000",
      ["ID", "Date", "Barangay", "Group ID", "Population Count", "Rate", "Total Payout", "Created By"], surveyRows);

    // Sync Settlements
    const settlementRows = (db.settlements || []).map((s: any) => [s.id, s.settlementDate, s.fromDate, s.toDate, s.totalAmount, s.remarks]);
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Settlements!A1:F1000",
      ["ID", "Settlement Date", "From Date", "To Date", "Total Amount", "Remarks"], settlementRows);

    // Sync Paid Payroll
    const paidRows = (db.paidPayroll || []).map((p: any) => [p.id, p.settlementId, p.surveyId, p.groupName, p.barangay, p.populationCount, p.rate, p.totalPayout, p.paidDate]);
    await overwriteGoogleSheetClient(config.spreadsheetId, config.clientEmail, config.privateKey, "Paid Payroll!A1:I1000",
      ["ID", "Settlement ID", "Survey ID", "Group Name", "Barangay", "Population Count", "Rate", "Total Payout", "Paid Date"], paidRows);

    console.log("[Client Sync] Full Google Sheets bulk sync completed successfully.");
  } catch (err: any) {
    console.error("[Client Sync] Sheet sync exception: ", err.message);
    throw err;
  }
}

export async function tryAppendToGoogleSheetClient(config: any, sheetName: string, row: any[]) {
  if (!config || !config.isSyncEnabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return;
  }
  try {
    await ensureGoogleSheetsExistClient(config.spreadsheetId, config.clientEmail, config.privateKey, [sheetName]);
    await appendGoogleSheetRowClient(
      config.spreadsheetId,
      config.clientEmail,
      config.privateKey,
      `${sheetName}!A:Z`,
      row
    );
  } catch (err: any) {
    console.error(`[Client Sync] Error appending row:`, err.message);
  }
}
