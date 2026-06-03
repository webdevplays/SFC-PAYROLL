/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Employees } from './components/Employees';
import { Barangays } from './components/Barangays';
import { Groups } from './components/Groups';
import { Payroll } from './components/Payroll';
import { Settlement } from './components/Settlement';
import { PaidPayroll } from './components/PaidPayroll';
import { Reports } from './components/Reports';
import { AuditLogs } from './components/AuditLogs';
import { AdminAccounts } from './components/AdminAccounts';

import { 
  Users, 
  MapPin, 
  FolderGit2, 
  ClipboardCheck, 
  Receipt, 
  History, 
  BarChart3, 
  FileLock2, 
  LogOut, 
  LayoutDashboard,
  Loader2,
  Menu,
  X,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function AppContent() {
  const { token, user, logout, currentTab, navigate, isLoading } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarMinimized, setSidebarMinimized] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_minimized') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setSidebarMinimized((prev) => {
      const nextVal = !prev;
      localStorage.setItem('sidebar_minimized', String(nextVal));
      return nextVal;
    });
  };

  // If unauthorized session, force login page layout
  if (!token) {
    return <Login />;
  }

  // Sidebar navigation menu lists
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'barangays', label: 'Barangays', icon: MapPin },
    { id: 'groups', label: 'Manage Groups', icon: FolderGit2 },
    { id: 'payroll', label: 'Payroll', icon: ClipboardCheck },
    { id: 'settlement', label: 'Settlement Module', icon: Receipt },
    { id: 'paid_payroll', label: 'Paid Payroll Page', icon: History },
    { id: 'reports', label: 'Reports Module', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Logs', icon: FileLock2 },
    ...(user?.username === 'masterkey2026' ? [{ id: 'admin_accounts', label: 'Manage Admins', icon: UserPlus }] : []),
  ];

  const handleNavigate = (tabId: string) => {
    navigate(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans">
      
      {/* 1. SIDEBAR: DESKTOP ONLY */}
      <aside className={`hidden lg:flex lg:flex-col ${sidebarMinimized ? 'lg:w-20' : 'lg:w-64'} h-full bg-slate-900 text-slate-400 p-5 shrink-0 justify-between border-r border-slate-950 transition-all duration-300 ease-in-out`}>
        <div className="space-y-8">
          {/* Main Logo title & Minimize icon */}
          <div className={`flex items-center ${sidebarMinimized ? 'flex-col gap-4' : 'justify-between'} px-2 pt-2`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-800 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-sm">
                <img 
                  src="https://www.image2url.com/r2/default/images/1779782151932-e0fcc309-3ed7-4c15-a3fa-1859006492a3.png" 
                  alt="SFC Logo" 
                  className="h-8 w-8 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              {!sidebarMinimized && (
                <div className="transition-all duration-200">
                  <span className="block text-sm font-black text-white tracking-tight leading-tight">Field Survey</span>
                  <span className="text-[10px] text-slate-450 uppercase tracking-wider font-extrabold font-mono">Payroll Core API</span>
                </div>
              )}
            </div>
            
            {/* Minimize Icon on Navigation */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition duration-150 flex items-center justify-center"
              title={sidebarMinimized ? "Expand Navigation Menu" : "Minimize Navigation Menu"}
            >
              {sidebarMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation link rows */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center ${sidebarMinimized ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} text-xs font-semibold rounded-xl transition duration-150 select-none ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/15'
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  }`}
                  title={item.label}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!sidebarMinimized && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer parameters */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          {/* Logged user block details */}
          <div className={`flex items-center ${sidebarMinimized ? 'justify-center px-0' : 'gap-3 px-1.5'}`}>
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-extrabold border border-indigo-50/10 uppercase select-none text-xs shrink-0" title={user?.fullName}>
              {user?.username?.substring(0, 2)}
            </div>
            {!sidebarMinimized && (
              <div className="truncate text-left transition-all duration-200">
                <span className="block text-xs font-bold text-white leading-snug">{user?.fullName}</span>
                <span className={`inline-block font-mono text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md mt-0.5 ${
                  user?.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-850 text-slate-400 border border-slate-800'
                }`}>
                  {user?.role}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className={`w-full flex items-center ${sidebarMinimized ? 'justify-center px-0' : 'gap-3 px-4'} py-3 text-rose-450 hover:bg-slate-800 rounded-xl transition duration-150 text-xs font-semibold`}
            title="Logout Securely"
          >
            <LogOut className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            {!sidebarMinimized && <span>Logout Securely</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN LAYOUT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full h-full overflow-hidden">
        
        {/* TOP COMPLIANCE HEADER PANEL */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            {/* Mobile menu list toggle button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-150 text-slate-700 hover:bg-slate-50 transition"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Breadcrumbs status */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-bold">System Workspace</span>
              <span>/</span>
              <span className="font-black text-slate-700 capitalize">
                {currentTab.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Loader Spinner */}
            {isLoading && (
              <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Syncing Database...</span>
              </div>
            )}

            {/* Top right session flag indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-150 rounded-xl text-[10px] font-mono select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500 uppercase font-black">Sheets Sync Engine Ready</span>
            </div>
          </div>
        </header>

        {/* MOBILE SIDEBAR/MENU DRAWER ROW */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}>
            <div className="relative flex flex-col w-full max-w-xs bg-slate-950 text-slate-400 p-5 justify-between shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-8">
                {/* Header inside menu logo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-sm">
                      <img 
                        src="https://www.image2url.com/r2/default/images/1779782151932-e0fcc309-3ed7-4c15-a3fa-1859006492a3.png" 
                        alt="SFC Logo" 
                        className="h-8 w-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="block text-sm font-black text-white tracking-tight leading-tight">Field Survey</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Sheets DB Portal</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Close Menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Navigation link rows */}
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const IconComp = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 text-xs font-semibold px-4 py-3 rounded-xl transition ${
                          isActive 
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-slate-850 hover:text-white text-slate-400'
                        }`}
                      >
                        <IconComp className="h-4.5 w-4.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Sidebar Footer parameters */}
              <div className="border-t border-slate-850 pt-5 space-y-4">
                <div className="flex items-center gap-3 px-1.5">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-extrabold uppercase text-xs">
                    {user?.username?.substring(0, 2)}
                  </div>
                  <div className="truncate text-left">
                    <span className="block text-xs font-black text-white">{user?.fullName}</span>
                    <span className="block font-mono text-[9px] uppercase font-bold text-indigo-400">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 text-xs font-extrabold px-4 py-3 text-rose-500 hover:bg-slate-850 rounded-xl transition"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Logout Securely
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. DYNAMIC WORKSPACE CONTROLLER CORE LAYOUT CANVAS */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 my-4 lg:my-6 font-sans max-w-7xl w-full mx-auto print:p-0 print:overflow-visible transition-all duration-300">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'employees' && <Employees />}
          {currentTab === 'barangays' && <Barangays />}
          {currentTab === 'groups' && <Groups />}
          {currentTab === 'payroll' && <Payroll />}
          {currentTab === 'settlement' && <Settlement />}
          {currentTab === 'paid_payroll' && <PaidPayroll />}
          {currentTab === 'reports' && <Reports />}
          {currentTab === 'audit_logs' && <AuditLogs />}
          {currentTab === 'admin_accounts' && user?.username === 'masterkey2026' && <AdminAccounts />}
        </main>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
