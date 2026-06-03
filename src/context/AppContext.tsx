/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, Barangay, Group, Survey, Settlement, PaidPayroll, AuditLog, User, SheetConfig, UserCredentials } from '../types';
import { syncDatabaseToGoogleSheetsClient, tryAppendToGoogleSheetClient, pullDatabaseFromGoogleSheetsClient } from '../utils/clientSync';

const base64EncodeString = (str: string) => {
  return btoa(unescape(encodeURIComponent(str)));
};

const getLocalDB = () => {
  const data = localStorage.getItem('field_survey_local_db');
  if (data) {
    try {
      const db = JSON.parse(data);
      if (!db.employees) db.employees = [];
      if (!db.barangays) db.barangays = [];
      if (!db.groups) db.groups = [];
      if (!db.surveys) db.surveys = [];
      if (!db.settlements) db.settlements = [];
      if (!db.paidPayroll) db.paidPayroll = [];
      if (!db.auditLogs) db.auditLogs = [];
      if (!db.users) db.users = [];
      if (!db.sheetConfig) {
        db.sheetConfig = {
          spreadsheetId: process.env.SPREADSHEET_ID || "",
          clientId: "",
          clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
          privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
          isSyncEnabled: !!(process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
        };
      } else {
        if (!db.sheetConfig.spreadsheetId && process.env.SPREADSHEET_ID) {
          db.sheetConfig.spreadsheetId = process.env.SPREADSHEET_ID;
        }
        if (!db.sheetConfig.clientEmail && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
          db.sheetConfig.clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        }
        if (!db.sheetConfig.privateKey && process.env.GOOGLE_PRIVATE_KEY) {
          db.sheetConfig.privateKey = process.env.GOOGLE_PRIVATE_KEY;
        }
        db.sheetConfig.isSyncEnabled = !!(db.sheetConfig.spreadsheetId && db.sheetConfig.clientEmail && db.sheetConfig.privateKey);
      }
      return db;
    } catch (e) {
      // ignore
    }
  }
  return {
    employees: [],
    barangays: [],
    groups: [],
    surveys: [],
    settlements: [],
    paidPayroll: [],
    auditLogs: [],
    users: [],
    sheetConfig: {
      spreadsheetId: process.env.SPREADSHEET_ID || "",
      clientId: "",
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
      isSyncEnabled: !!(process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
    }
  };
};

const saveLocalDB = (db: any) => {
  localStorage.setItem('field_survey_local_db', JSON.stringify(db));
};

interface AppContextType {
  token: string | null;
  user: User | null;
  employees: Employee[];
  barangays: Barangay[];
  groups: Group[];
  surveys: Survey[];
  settlements: Settlement[];
  paidPayroll: PaidPayroll[];
  auditLogs: AuditLog[];
  users: UserCredentials[];
  sheetConfig: SheetConfig | null;
  currentTab: string;
  isLoading: boolean;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[];
  
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // CRUD Actions
  fetchData: () => Promise<void>;
  addCustomUser: (userObj: Omit<UserCredentials, 'id' | 'createdDate'>) => Promise<boolean>;
  deleteCustomUser: (id: string) => Promise<boolean>;
  addEmployee: (emp: Omit<Employee, 'id' | 'createdDate'>) => Promise<void>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  
  addBarangay: (bgy: Omit<Barangay, 'id' | 'createdDate'>) => Promise<void>;
  updateBarangay: (id: string, bgy: Partial<Barangay>) => Promise<void>;
  deleteBarangay: (id: string) => Promise<void>;
  
  addGroup: (grp: Omit<Group, 'id' | 'status'>) => Promise<void>;
  updateGroup: (id: string, grp: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  
  addSurvey: (srv: Omit<Survey, 'id' | 'totalPayout' | 'createdBy' | 'createdDate'>) => Promise<void>;
  updateSurvey: (id: string, srv: Partial<Survey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  
  addSettlement: (fromDate: string, toDate: string, remarks: string) => Promise<boolean>;
  saveSettings: (config: SheetConfig) => Promise<boolean>;
  pullFromSheets: () => Promise<boolean>;
  
  // UI Utilities
  navigate: (tab: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('field_survey_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('field_survey_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [paidPayroll, setPaidPayroll] = useState<PaidPayroll[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserCredentials[]>([]);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
  
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(() => {
    return localStorage.getItem('field_survey_fallback') === 'true';
  });

  // Client DB State Refresh
  const loadLocalState = () => {
    const db = getLocalDB();
    setEmployees(db.employees);
    setBarangays(db.barangays);
    setGroups(db.groups);
    setSurveys(db.surveys);
    setSettlements(db.settlements);
    setPaidPayroll(db.paidPayroll);
    setAuditLogs(db.auditLogs);
    setUsers(db.users || []);
    setSheetConfig(db.sheetConfig);
  };

  // Client sheet append helper
  const addLocalAuditLog = (db: any, userStr: string, action: string) => {
    const log = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user: userStr,
      action,
      timestamp: new Date().toISOString()
    };
    db.auditLogs = [log, ...(db.auditLogs || [])].slice(0, 1000);
    tryAppendToGoogleSheetClient(db.sheetConfig, "AuditLogs", [
      log.id,
      log.user,
      log.action,
      log.timestamp
    ]).catch(err => console.error("Client log schema sync warning:", err.message));
  };

  // Client state and sheets sync updater
  const saveAndSyncLocalDB = async (db: any) => {
    saveLocalDB(db);
    if (db.sheetConfig && db.sheetConfig.isSyncEnabled) {
      syncDatabaseToGoogleSheetsClient(db, db.sheetConfig).catch((err) => {
        console.error("Client Auto Sync failure:", err.message);
      });
    }
  };

  // Show Toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Setup Auth headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': token || ''
    };
  };

  // Fetch all system data
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);

    if (isFallbackMode) {
      loadLocalState();
      setIsLoading(false);
      
      const db = getLocalDB();
      if (db.sheetConfig && db.sheetConfig.isSyncEnabled) {
        // If the local database is cold (empty) on this device, pull/hydrate instead of pushing! This prevents blank overrides.
        const isLocalCold = (!db.employees || db.employees.length === 0) && (!db.users || db.users.length === 0);
        if (isLocalCold) {
          console.log("[Client Bootstrap] Cold start detected in offline mode. Pulling state from Google Sheets...");
          pullDatabaseFromGoogleSheetsClient(db.sheetConfig)
            .then((restored) => {
              db.employees = restored.employees;
              db.barangays = restored.barangays;
              db.groups = restored.groups;
              db.surveys = restored.surveys;
              db.settlements = restored.settlements;
              db.paidPayroll = restored.paidPayroll;
              if (restored.users && restored.users.length > 0) {
                db.users = restored.users;
              }
              const auditDb = getLocalDB();
              auditDb.employees = restored.employees;
              auditDb.barangays = restored.barangays;
              auditDb.groups = restored.groups;
              auditDb.surveys = restored.surveys;
              auditDb.settlements = restored.settlements;
              auditDb.paidPayroll = restored.paidPayroll;
              auditDb.users = restored.users;
              saveLocalDB(auditDb);
              loadLocalState();
              console.log("[Client Bootstrap] Cold re-hydration from Google Sheets completed successfully!");
            })
            .catch((err) => {
              console.warn("[Client Bootstrap] Cold re-hydration failed, skipping:", err.message);
            });
        } else {
          syncDatabaseToGoogleSheetsClient(db, db.sheetConfig).catch((err) => {
            console.warn("[Client Sync] Startup sheet sync skipped/failed:", err.message);
          });
        }
      }
      return;
    }

    try {
      const headers = getHeaders();

      const [empRes, bgyRes, grpRes, srvRes, setRes, paidRes, logRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/employees', { headers }),
        fetch('/api/barangays', { headers }),
        fetch('/api/groups', { headers }),
        fetch('/api/surveys', { headers }),
        fetch('/api/settlements', { headers }),
        fetch('/api/paid-payroll', { headers }),
        fetch('/api/logs', { headers }),
        fetch('/api/settings', { headers }),
        fetch('/api/users', { headers })
      ]);

      if (empRes.status === 404 || empRes.status === 502 || !empRes.ok) {
        throw new Error("Express backend returned terminal API 404 or connection rejected");
      }

      // Read responses safely
      const fetchedEmployees = empRes.ok ? await empRes.json() : [];
      const fetchedBarangays = bgyRes.ok ? await bgyRes.json() : [];
      const fetchedGroups = grpRes.ok ? await grpRes.json() : [];
      const fetchedSurveys = srvRes.ok ? await srvRes.json() : [];
      const fetchedSettlements = setRes.ok ? await setRes.json() : [];
      const fetchedPaidPayroll = paidRes.ok ? await paidRes.json() : [];
      const fetchedAuditLogs = logRes.ok ? await logRes.json() : [];
      const fetchedSheetConfig = settingsRes.ok ? await settingsRes.json() : null;
      const fetchedUsers = (usersRes && usersRes.ok) ? await usersRes.json() : [];

      const localDB = getLocalDB();

      // Check if server database has been wiped (which happens during redeployment/update of ephemeral containers)
      const isServerEmpty = fetchedEmployees.length === 0 && fetchedBarangays.length === 0 && fetchedGroups.length === 0 && fetchedUsers.length === 0;
      const hasLocalBackup = (localDB.employees && localDB.employees.length > 0) || (localDB.users && localDB.users.length > 0) || (localDB.sheetConfig && localDB.sheetConfig.isSyncEnabled && !!localDB.sheetConfig.spreadsheetId);

      if (isServerEmpty && hasLocalBackup) {
        console.log("[Auto-Restore] Empty backend database detected. Re-hydrating server-side state from client local backup...");
        try {
          const restoreRes = await fetch('/api/settings/restore-backup', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              employees: localDB.employees,
              barangays: localDB.barangays,
              groups: localDB.groups,
              surveys: localDB.surveys,
              settlements: localDB.settlements,
              paidPayroll: localDB.paidPayroll,
              users: localDB.users,
              sheetConfig: localDB.sheetConfig
            })
          });
          if (restoreRes.ok) {
            showToast("Database state safely restored and synchronized from local device backup!", "success");
            // Retry fetch to pull newly restored database
            setTimeout(() => {
              fetchData();
            }, 150);
            return;
          }
        } catch (restoreErr) {
          console.error("[Auto-Restore] Error pre-empting database wipe:", restoreErr);
        }
      }

      // Normal application state assignment
      setEmployees(fetchedEmployees);
      setBarangays(fetchedBarangays);
      setGroups(fetchedGroups);
      setSurveys(fetchedSurveys);
      setSettlements(fetchedSettlements);
      setPaidPayroll(fetchedPaidPayroll);
      setAuditLogs(fetchedAuditLogs);
      setSheetConfig(fetchedSheetConfig);
      setUsers(fetchedUsers);

      // Save a local storage backup to protect the database during any future server wipes
      let mergedSheetConfig = fetchedSheetConfig;
      if (fetchedSheetConfig && fetchedSheetConfig.privateKey === "••••••••••••••••••••" && localDB.sheetConfig?.privateKey) {
        mergedSheetConfig = {
          ...fetchedSheetConfig,
          privateKey: localDB.sheetConfig.privateKey
        };
      }

      const cacheDB = {
        employees: fetchedEmployees,
        barangays: fetchedBarangays,
        groups: fetchedGroups,
        surveys: fetchedSurveys,
        settlements: fetchedSettlements,
        paidPayroll: fetchedPaidPayroll,
        auditLogs: fetchedAuditLogs,
        users: fetchedUsers,
        sheetConfig: mergedSheetConfig || localDB.sheetConfig
      };
      saveLocalDB(cacheDB);

    } catch (err) {
      console.warn("Express backend unreachable, triggering Local Fallback State: ", err);
      localStorage.setItem('field_survey_fallback', 'true');
      setIsFallbackMode(true);
      loadLocalState();
      
      const db = getLocalDB();
      if (db.sheetConfig && db.sheetConfig.isSyncEnabled) {
        syncDatabaseToGoogleSheetsClient(db, db.sheetConfig).catch((err) => {
          console.warn("[Client Sync] Offline fallback sheets sync error:", err.message);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load tables initially
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, isFallbackMode]);

  const executeClientLogin = (username: string, password: string): boolean => {
    let clientUser: User | null = null;
    
    // Check local database custom users first
    const db = getLocalDB();
    const customUser = (db.users || []).find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (customUser) {
      clientUser = { username: customUser.username, role: customUser.role, fullName: customUser.fullName };
    } else if (username === 'admin' && password === 'password123') {
      clientUser = { username: 'admin', role: 'Admin', fullName: 'Google Admin' };
    } else if (username === 'masterkey2026' && password === '021994') {
      clientUser = { username: 'masterkey2026', role: 'Admin', fullName: 'Google Admin Master' };
    } else if (username === 'staff' && password === 'password123') {
      clientUser = { username: 'staff', role: 'Payroll Staff', fullName: 'Sarah Staff' };
    }

    if (clientUser) {
      const mockToken = base64EncodeString(JSON.stringify(clientUser));
      localStorage.setItem('field_survey_token', mockToken);
      localStorage.setItem('field_survey_user', JSON.stringify(clientUser));
      setToken(mockToken);
      setUser(clientUser);
      setCurrentTab('dashboard');
      
      const db = getLocalDB();
      saveLocalDB(db);
      loadLocalState();

      showToast(`Welcome back, ${clientUser.fullName}! (Static Mode)`, "success");
      
      if (db.sheetConfig && db.sheetConfig.isSyncEnabled) {
        syncDatabaseToGoogleSheetsClient(db, db.sheetConfig)
          .then(() => showToast("Google Sheets Sync active & verified!", "success"))
          .catch((err) => console.error("Client login sheet sync:", err.message));
      }
      return true;
    } else {
      showToast("Access denied. Please check your username and password.", "error");
      return false;
    }
  };

  // Auth Functions
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    if (isFallbackMode) {
      setIsLoading(false);
      return executeClientLogin(username, password);
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.status === 404 || res.status === 502) {
        console.warn("Auth API returning 404/502. Activating client fallback mode.");
        localStorage.setItem('field_survey_fallback', 'true');
        setIsFallbackMode(true);
        setIsLoading(false);
        return executeClientLogin(username, password);
      }

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Login parameters failed.", "error");
        return false;
      }

      const data = await res.json();
      localStorage.setItem('field_survey_token', data.token);
      localStorage.setItem('field_survey_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setCurrentTab('dashboard');
      showToast(`Welcome back, ${data.user.fullName}!`, "success");
      return true;
    } catch (err) {
      console.warn("Login failure. Toggling client fallback authentication.");
      localStorage.setItem('field_survey_fallback', 'true');
      setIsFallbackMode(true);
      setIsLoading(false);
      return executeClientLogin(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('field_survey_token');
    localStorage.removeItem('field_survey_user');
    setToken(null);
    setUser(null);
    setEmployees([]);
    setBarangays([]);
    setGroups([]);
    setSurveys([]);
    setSettlements([]);
    setPaidPayroll([]);
    setAuditLogs([]);
    setSheetConfig(null);
    setCurrentTab('dashboard');
    showToast("Logged out successfully.", "info");
  };

  // Dynamic user accounts management
  const addCustomUser = async (userObj: Omit<UserCredentials, 'id' | 'createdDate'>): Promise<boolean> => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.users = db.users || [];
      if (db.users.some((u: any) => u.username.toLowerCase() === userObj.username.toLowerCase()) ||
          ['admin', 'staff', 'masterkey2026'].includes(userObj.username.toLowerCase())) {
        showToast("Username is already taken.", "error");
        setIsLoading(false);
        return false;
      }
      
      const newUser: UserCredentials = {
        ...userObj,
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        createdDate: new Date().toISOString().split('T')[0]
      };
      
      db.users = [...db.users, newUser];
      addLocalAuditLog(db, user?.username || 'unknown', `Provisioned Admin Account: ${userObj.username} (${userObj.fullName})`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Admin account registered successfully!", "success");
      setIsLoading(false);
      return true;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userObj)
      });
      if (res.ok) {
        showToast("Admin account registered successfully!", "success");
        await fetchData();
        setIsLoading(false);
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || "Could not register account.", "error");
        setIsLoading(false);
        return false;
      }
    } catch (e) {
      showToast("Error processing request.", "error");
      setIsLoading(false);
      return false;
    }
  };

  const deleteCustomUser = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.users = db.users || [];
      const userToDelete = db.users.find((u: any) => u.id === id);
      db.users = db.users.filter((u: any) => u.id !== id);
      
      addLocalAuditLog(db, user?.username || 'unknown', `Revoked User Account: ${userToDelete?.username || id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Account access revoked.", "success");
      setIsLoading(false);
      return true;
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast("Account access revoked.", "success");
        await fetchData();
        setIsLoading(false);
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || "Could not revoke account.", "error");
        setIsLoading(false);
        return false;
      }
    } catch (e) {
      showToast("Error processing request.", "error");
      setIsLoading(false);
      return false;
    }
  };

  // Employee CRM
  const addEmployee = async (emp: Omit<Employee, 'id' | 'createdDate'>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const newEmp: Employee = {
        ...emp,
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        createdDate: new Date().toISOString().split('T')[0]
      };
      db.employees = [...db.employees, newEmp];
      addLocalAuditLog(db, user?.username || 'unknown', `Registered Employee: ${newEmp.fullName}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Employee registered successfully!", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        showToast("Employee registered successfully!", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Could not add employee.", "error");
      }
    } catch (e) {
      showToast("Error processing request.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmployee = async (id: string, emp: Partial<Employee>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.employees = db.employees.map((e: any) => e.id === id ? { ...e, ...emp } : e);
      const updated = db.employees.find((e: any) => e.id === id);
      addLocalAuditLog(db, user?.username || 'unknown', `Revised Employee records: ${updated ? updated.fullName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Employee details updated.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        showToast("Employee details updated.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Could not update employee.", "error");
      }
    } catch (e) {
      showToast("Error saving changes.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const isLeader = db.groups.some((g: any) => g.leaderId === id || (g.coLeaderIds && g.coLeaderIds.includes(id)));
      if (isLeader) {
        showToast("Error: Employee is designated in a Group. Disband/change leadership first.", "error");
        setIsLoading(false);
        return;
      }
      const targetEmp = db.employees.find((e: any) => e.id === id);
      db.employees = db.employees.filter((e: any) => e.id !== id);
      addLocalAuditLog(db, user?.username || 'unknown', `Deleted Employee: ${targetEmp ? targetEmp.fullName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Employee removed.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast("Employee removed.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Are they assigned to a group?", "error");
      }
    } catch (e) {
      showToast("Error status returned.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Barangay CRM
  const addBarangay = async (bgy: Omit<Barangay, 'id' | 'createdDate'>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const newBgy: Barangay = {
        ...bgy,
        id: `BGY-${Math.floor(100 + Math.random() * 900)}`,
        createdDate: new Date().toISOString().split('T')[0]
      };
      db.barangays = [...db.barangays, newBgy];
      addLocalAuditLog(db, user?.username || 'unknown', `Added Barangay: ${newBgy.barangayName}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Barangay added successfully!", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/barangays', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(bgy)
      });
      if (res.ok) {
        showToast("Barangay added successfully!", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Error registers.", "error");
      }
    } catch (e) {
      showToast("Error saving data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateBarangay = async (id: string, bgy: Partial<Barangay>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.barangays = db.barangays.map((b: any) => b.id === id ? { ...b, ...bgy } : b);
      const updated = db.barangays.find((b: any) => b.id === id);
      addLocalAuditLog(db, user?.username || 'unknown', `Updated Barangay context: ${updated ? updated.barangayName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Barangay records revised.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/barangays/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(bgy)
      });
      if (res.ok) {
        showToast("Barangay records revised.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Update registers failure.", "error");
      }
    } catch (e) {
      showToast("Unable to send request.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBarangay = async (id: string) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const targetBgy = db.barangays.find((b: any) => b.id === id);
      const isAssigned = db.groups.some((g: any) => g.barangayAssigned === (targetBgy ? targetBgy.barangayName : ''));
      if (isAssigned) {
        showToast("Error: Barangay is currently assigned to a group.", "error");
        setIsLoading(false);
        return;
      }
      db.barangays = db.barangays.filter((b: any) => b.id !== id);
      addLocalAuditLog(db, user?.username || 'unknown', `Deleted Barangay details: ${targetBgy ? targetBgy.barangayName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Barangay deleted.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/barangays/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast("Barangay deleted.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Delete parameters rejected.", "error");
      }
    } catch (e) {
      showToast("Request failure.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Group CRM
  const addGroup = async (grp: Omit<Group, 'id' | 'status'>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const newGroup: Group = {
        ...grp,
        id: `GRP-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Active'
      };
      db.groups = [...db.groups, newGroup];
      addLocalAuditLog(db, user?.username || 'unknown', `Created Survey Group: ${newGroup.groupName}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Survey Group created successfully!", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(grp)
      });
      if (res.ok) {
        showToast("Survey Group created successfully!", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Invalid group details.", "error");
      }
    } catch (e) {
      showToast("Request issue.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateGroup = async (id: string, grp: Partial<Group>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.groups = db.groups.map((g: any) => g.id === id ? { ...g, ...grp } : g);
      const updated = db.groups.find((g: any) => g.id === id);
      addLocalAuditLog(db, user?.username || 'unknown', `Altered Group Configuration: ${updated ? updated.groupName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Group settings modified.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(grp)
      });
      if (res.ok) {
        showToast("Group settings modified.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Could not modify group.", "error");
      }
    } catch (e) {
      showToast("Server feedback issue.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGroup = async (id: string) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const hasSurveys = db.surveys.some((s: any) => s.groupId === id);
      if (hasSurveys) {
        showToast("Error: Group has uncommitted surveys. Process settlement first.", "error");
        setIsLoading(false);
        return;
      }
      const targetGrp = db.groups.find((g: any) => g.id === id);
      db.groups = db.groups.filter((g: any) => g.id !== id);
      addLocalAuditLog(db, user?.username || 'unknown', `Disbanded Group: ${targetGrp ? targetGrp.groupName : id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Group disbanded.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast("Group disbanded.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Check if active surveys are uncomitted.", "error");
      }
    } catch (e) {
      showToast("Unable to reach server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Surveys Add / Edit / Remove
  const addSurvey = async (srv: Omit<Survey, 'id' | 'totalPayout' | 'createdBy' | 'createdDate'>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const incomingGroup = (db.groups || []).find((g: any) => g.id === srv.groupId);
      const incomingLeaderId = incomingGroup ? incomingGroup.leaderId : null;

      if (incomingLeaderId) {
        const existingSrv = (db.surveys || []).find((s: any) => {
          if (s.barangay !== srv.barangay) return false;
          const gObj = (db.groups || []).find((g: any) => g.id === s.groupId);
          return gObj && gObj.leaderId === incomingLeaderId;
        });

        if (existingSrv) {
          existingSrv.populationCount += Number(srv.populationCount);
          existingSrv.totalPayout = existingSrv.populationCount * existingSrv.rate;
          existingSrv.date = srv.date;
          
          addLocalAuditLog(db, user?.username || 'unknown', `Merged Count into Survey ID: ${existingSrv.id} for Barangay: ${srv.barangay} (Leader: ${incomingLeaderId})`);
          await saveAndSyncLocalDB(db);
          loadLocalState();
          showToast("Entry aggregated with existing Survey population count successfully!", "success");
          setIsLoading(false);
          return;
        }
      }

      const totalPayout = srv.populationCount * srv.rate;
      const newSrv: Survey = {
        ...srv,
        id: `SRV-${Math.floor(100 + Math.random() * 900)}`,
        totalPayout,
        createdBy: user?.username || 'unknown',
        createdDate: new Date().toISOString()
      };
      db.surveys = [...db.surveys, newSrv];
      addLocalAuditLog(db, user?.username || 'unknown', `Added Survey Entry for Group: ${newSrv.groupId}, Barangay: ${newSrv.barangay}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Survey entry posted successfully!", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(srv)
      });
      if (res.ok) {
        showToast("Survey entry posted successfully!", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Form error, please verify data.", "error");
      }
    } catch (e) {
      showToast("Failed to post entry.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSurvey = async (id: string, srv: Partial<Survey>) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.surveys = db.surveys.map((s: any) => {
        if (s.id === id) {
          const merged = { ...s, ...srv };
          merged.totalPayout = merged.populationCount * merged.rate;
          return merged;
        }
        return s;
      });
      addLocalAuditLog(db, user?.username || 'unknown', `Modified Survey Records ID: ${id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Survey entry altered.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(srv)
      });
      if (res.ok) {
        showToast("Survey entry altered.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Form validation error.", "error");
      }
    } catch (e) {
      showToast("Connection issue.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSurvey = async (id: string) => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      db.surveys = db.surveys.filter((s: any) => s.id !== id);
      addLocalAuditLog(db, user?.username || 'unknown', `Deleted Survey Entry ID: ${id}`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast("Survey entry deleted.", "success");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast("Survey entry deleted.", "success");
        await fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to remove item.", "error");
      }
    } catch (e) {
      showToast("Action ignored.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Settle Payroll Range
  const addSettlement = async (fromDate: string, toDate: string, remarks: string): Promise<boolean> => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      const matchingSurveys = db.surveys.filter((s: any) => {
        return s.date >= fromDate && s.date <= toDate;
      });

      if (matchingSurveys.length === 0) {
        showToast("No active surveys found in this date range to settle.", "error");
        setIsLoading(false);
        return false;
      }

      const totalAmount = matchingSurveys.reduce((sum: number, s: any) => sum + s.totalPayout, 0);
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

      const paidEntries: any[] = [];
      matchingSurveys.forEach((s: any) => {
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

      db.settlements = [...db.settlements, settlement];
      db.paidPayroll = [...db.paidPayroll, ...paidEntries];

      db.surveys = db.surveys.filter((s: any) => {
        return !(s.date >= fromDate && s.date <= toDate);
      });

      addLocalAuditLog(db, user?.username || 'unknown', `Settlement Processing ID: ${settlementId}, Settled: ${totalAmount} PHP across ${paidEntries.length} surveys`);
      await saveAndSyncLocalDB(db);
      loadLocalState();
      showToast(`Settlement processed successfully! Settled ${totalAmount.toLocaleString()} PHP.`, "success");
      setIsLoading(false);
      return true;
    }

    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fromDate, toDate, remarks })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Settlement processed successfully! Settled ${data.totalMoved.toLocaleString()} PHP.`, "success");
        await fetchData();
        return true;
      } else {
        showToast(data.error || "Could not complete payroll settlement.", "error");
        return false;
      }
    } catch (e) {
      showToast("Network failure executing settlement operations.", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Google Sheets config
  const saveSettings = async (config: SheetConfig): Promise<boolean> => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      let keyToSave = config.privateKey;
      if (keyToSave === "••••••••••••••••••••") {
        keyToSave = db.sheetConfig?.privateKey || "";
      }
      db.sheetConfig = {
        ...config,
        privateKey: keyToSave,
        isSyncEnabled: !!(config.spreadsheetId && config.clientEmail && keyToSave)
      };

      addLocalAuditLog(db, user?.username || 'unknown', `Modified Google Sheets settings client-side (Enabled: ${db.sheetConfig.isSyncEnabled})`);
      saveLocalDB(db);
      loadLocalState();

      if (db.sheetConfig.isSyncEnabled && db.sheetConfig.spreadsheetId && db.sheetConfig.privateKey) {
        showToast("Synchronizing data tables to Google Sheets from browser...", "info");
        try {
          await syncDatabaseToGoogleSheetsClient(db, db.sheetConfig);
          showToast("Settings saved and Google Sheets sync succeeded!", "success");
        } catch (err: any) {
          showToast(`Warning: Config saved but Google Sheets failed: ${err.message}`, "warning");
        }
      } else {
        showToast("Google Sheets Configuration updated!", "success");
      }
      setIsLoading(false);
      return true;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "warning") {
          showToast(data.message, "warning");
        } else {
          showToast(data.message || "Google Sheets Configuration updated!", "success");
        }
        await fetchData();
        return true;
      } else {
        showToast(data.error || "Save rejected by server backend.", "error");
        return false;
      }
    } catch (e) {
      showToast("Unable to sync database config.", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to pull/restore all data from Google Sheets dynamically
  const pullFromSheets = async (): Promise<boolean> => {
    setIsLoading(true);
    if (isFallbackMode) {
      const db = getLocalDB();
      if (!db.sheetConfig || !db.sheetConfig.isSyncEnabled) {
        showToast("Google Sheets sync is not configured or enabled.", "error");
        setIsLoading(false);
        return false;
      }
      try {
        showToast("Fetching active state data tables from Google Sheets...", "info");
        const restoredData = await pullDatabaseFromGoogleSheetsClient(db.sheetConfig);
        
        db.employees = restoredData.employees;
        db.barangays = restoredData.barangays;
        db.groups = restoredData.groups;
        db.surveys = restoredData.surveys;
        db.settlements = restoredData.settlements;
        db.paidPayroll = restoredData.paidPayroll;
        if (restoredData.users && restoredData.users.length > 0) {
          db.users = restoredData.users;
        }

        addLocalAuditLog(db, user?.username || 'unknown', "Manually pulled and synchronised state from Google Sheets client-side");
        saveLocalDB(db);
        loadLocalState();
        showToast("Database successfully fully loaded and synced from Google Sheets!", "success");
        setIsLoading(false);
        return true;
      } catch (err: any) {
        showToast(`Could not pull Google Sheet data: ${err.message}`, "error");
        setIsLoading(false);
        return false;
      }
    }

    try {
      showToast("Fetching active state from Google Sheets server-side...", "info");
      const res = await fetch('/api/settings/pull', {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Database successfully updated from Google Sheets!", "success");
        await fetchData();
        setIsLoading(false);
        return true;
      } else {
        showToast(data.error || "Google Sheets pull request was rejected.", "error");
        setIsLoading(false);
        return false;
      }
    } catch (e: any) {
      showToast(`Unable to pull database from Sheets: ${e.message}`, "error");
      setIsLoading(false);
      return false;
    }
  };

  const navigate = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <AppContext.Provider value={{
      token,
      user,
      employees,
      barangays,
      groups,
      surveys,
      settlements,
      paidPayroll,
      auditLogs,
      users,
      sheetConfig,
      currentTab,
      isLoading,
      toasts,
      login,
      logout,
      fetchData,
      addCustomUser,
      deleteCustomUser,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addBarangay,
      updateBarangay,
      deleteBarangay,
      addGroup,
      updateGroup,
      deleteGroup,
      addSurvey,
      updateSurvey,
      deleteSurvey,
      addSettlement,
      saveSettings,
      pullFromSheets,
      navigate,
      showToast,
      dismissToast
    }}>
      {children}
      
      {/* Toast Alert Canvas overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border text-sm flex items-center justify-between gap-3 animate-slide-in transition-all duration-300 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-950 border-emerald-200' :
              toast.type === 'error' ? 'bg-rose-50 text-rose-950 border-rose-200' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-950 border-amber-200' :
              'bg-slate-50 text-slate-950 border-slate-200'
            }`}
          >
            <div className="flex-1 font-medium">{toast.message}</div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-xs opacity-70 hover:opacity-100 font-mono select-none px-2 py-0.5 rounded-md hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
