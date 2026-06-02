/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, Barangay, Group, Survey, Settlement, PaidPayroll, AuditLog, User, SheetConfig } from '../types';

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
  sheetConfig: SheetConfig | null;
  currentTab: string;
  isLoading: boolean;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[];
  
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // CRUD Actions
  fetchData: () => Promise<void>;
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
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
  
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

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
    try {
      const headers = getHeaders();

      const [empRes, bgyRes, grpRes, srvRes, setRes, paidRes, logRes, settingsRes] = await Promise.all([
        fetch('/api/employees', { headers }),
        fetch('/api/barangays', { headers }),
        fetch('/api/groups', { headers }),
        fetch('/api/surveys', { headers }),
        fetch('/api/settlements', { headers }),
        fetch('/api/paid-payroll', { headers }),
        fetch('/api/logs', { headers }),
        fetch('/api/settings', { headers })
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (bgyRes.ok) setBarangays(await bgyRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
      if (srvRes.ok) setSurveys(await srvRes.json());
      if (setRes.ok) setSettlements(await setRes.json());
      if (paidRes.ok) setPaidPayroll(await paidRes.json());
      if (logRes.ok) setAuditLogs(await logRes.json());
      if (settingsRes.ok) setSheetConfig(await settingsRes.json());

    } catch (err) {
      console.error("Error fetching database tables:", err);
      showToast("Connection failure updating tables.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load tables initially
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Auth Functions
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

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
      console.error(err);
      showToast("Server connection error during login.", "error");
      return false;
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

  // Employee CRM
  const addEmployee = async (emp: Omit<Employee, 'id' | 'createdDate'>) => {
    setIsLoading(true);
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
      sheetConfig,
      currentTab,
      isLoading,
      toasts,
      login,
      logout,
      fetchData,
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
