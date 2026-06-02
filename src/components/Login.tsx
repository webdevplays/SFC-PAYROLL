/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, KeyRound, User as UserIcon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isLoading } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    if (!username || !password) {
      setErrorLocal("Please fill out all credentials.");
      return;
    }
    const success = await login(username, password);
    if (!success) {
      setErrorLocal("Access denied. Please check your username and password.");
    }
  };

  const handlePreFill = (user: string, pass: string = 'password123') => {
    setUsername(user);
    setPassword(pass);
    setErrorLocal(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-150 text-white">
          <Shield className="h-6 w-6" id="login-logo-shield" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-950">
          Field Survey Payroll
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Management & Settlement Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-100 rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorLocal && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl font-medium">
                {errorLocal}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g. admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-55"
              >
                {isLoading ? 'Verifying authentication...' : 'Login securely'}
              </button>
            </div>
          </form>

          {/* Quick tester credentials selector */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <span className="block text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Authorized Test Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handlePreFill('admin')}
                className="flex flex-col items-center p-2.5 rounded-2xl border border-slate-150 hover:bg-slate-50 text-center transition-all duration-200 group"
              >
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-650">Admin</span>
                <span className="text-[9px] text-slate-400 mt-1 font-mono">admin / pwd123</span>
              </button>
              <button
                onClick={() => handlePreFill('masterkey2026', '021994')}
                className="flex flex-col items-center p-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 text-center transition-all duration-200 group"
              >
                <span className="text-[11px] font-extrabold text-indigo-750 group-hover:text-indigo-600">Master</span>
                <span className="text-[9px] text-indigo-500 mt-1 font-mono font-bold">master... / 021994</span>
              </button>
              <button
                onClick={() => handlePreFill('staff')}
                className="flex flex-col items-center p-2.5 rounded-2xl border border-slate-150 hover:bg-slate-50 text-center transition-all duration-200 group"
              >
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-650">Staff</span>
                <span className="text-[9px] text-slate-400 mt-1 font-mono">staff / pwd123</span>
              </button>
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          Field Survey Payroll Management System Core API © 2026
        </p>
      </div>
    </div>
  );
};
