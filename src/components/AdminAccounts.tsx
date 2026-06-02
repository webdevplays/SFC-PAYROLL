/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Sparkles, UserPlus, Trash2, Key, Info, HelpCircle } from 'lucide-react';

export const AdminAccounts: React.FC = () => {
  const { users, addCustomUser, deleteCustomUser, user } = useApp();

  // Form fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Payroll Staff'>('Admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user?.username !== 'masterkey2026') {
    return (
      <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-rose-950 font-black text-lg">Access Denied</h1>
        <p className="text-rose-700 text-xs text-center">
          Only the secure masterkey credentials holder (masterkey2026) has authorization to view or manage admin privileges.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName || !role) return;

    setIsSubmitting(true);
    // Attempt credentials registration
    const success = await addCustomUser({
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      password,
      role
    });

    setIsSubmitting(false);
    if (success) {
      // Clear fields
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('Admin');
    }
  };

  const handleDelete = async (userId: string, targetUsername: string) => {
    if (confirm(`Are you sure you want to completely revoke credentials and delete access database records for user: @${targetUsername}?`)) {
      await deleteCustomUser(userId);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-6xl">
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          Manage Administrative Access Accounts
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          As the secure master server operator (<span className="font-bold text-indigo-600">@masterkey2026</span>), you can provision and revoke dynamic structural access accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form panel to registration */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm self-start space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">Add Access Account</h2>
              <p className="text-[10px] text-slate-400">Create new credentials</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Staff Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Clara"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Username ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. maria_admin"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium lowercase"
                required
              />
              <span className="text-[9px] text-slate-400 mt-1 block">Spaces will be compressed and parsed as lowercase.</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Access Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure password"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Assigned Role Scope
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Admin' | 'Payroll Staff')}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              >
                <option value="Admin">Admin (Full Database Privileges)</option>
                <option value="Payroll Staff">Payroll Staff (Read & Data Entry Only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-650 hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {isSubmitting ? 'Registering...' : 'Provision Secure Account'}
            </button>
          </form>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex gap-2.5 text-indigo-950 text-[10px] font-medium">
            <Key className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>
              Credentials can be directly utilized on the landing page immediately upon successful database registration.
            </span>
          </div>
        </div>

        {/* Existing Accounts Database Ledger */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-950">Active Authorized Accounts</h2>
              <p className="text-slate-400 text-xs mt-0.5">List of dynamic accounts registered on secure database server</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Account ID</th>
                    <th className="px-4 py-3 text-left">Full Name</th>
                    <th className="px-4 py-3 text-left">Username Handle</th>
                    <th className="px-4 py-3 text-left">Role Class</th>
                    <th className="px-4 py-3 text-left">Created Date</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Built-in static accounts visual markers for overview */}
                  <tr className="bg-slate-50/40 text-slate-400">
                    <td className="px-4 py-3 font-semibold text-slate-500 font-mono">SYSTEM-MSTR</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">Google Admin Master</td>
                    <td className="px-4 py-3 font-mono">@masterkey2026</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Admin (System Master)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">Permanent</td>
                    <td className="px-4 py-3 text-center italic text-[10px]">Locked System Account</td>
                  </tr>

                  <tr className="bg-slate-50/20 text-slate-450">
                    <td className="px-4 py-3 font-mono">SYSTEM-ADM</td>
                    <td className="px-4 py-3">John Administrator</td>
                    <td className="px-4 py-3 font-mono">@admin</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                        Admin (Static Setup)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">Permanent</td>
                    <td className="px-4 py-3 text-center italic text-[10px]">Locked System Account</td>
                  </tr>

                  <tr className="bg-slate-50/20 text-slate-450">
                    <td className="px-4 py-3 font-mono">SYSTEM-STF</td>
                    <td className="px-4 py-3">Sarah Staff</td>
                    <td className="px-4 py-3 font-mono">@staff</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                        Staff (Static Setup)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">Permanent</td>
                    <td className="px-4 py-3 text-center italic text-[10px]">Locked System Account</td>
                  </tr>

                  {/* Custom Provisioned Users List */}
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium bg-slate-50/10 italic">
                        No custom dynamic accounts created yet. Use the left form to provision credentials.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 transition duration-150">
                        <td className="px-4 py-3 font-black text-indigo-600 font-mono">{item.id}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.fullName}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono font-semibold">@{item.username}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-105 text-slate-600'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{item.createdDate}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(item.id, item.username)}
                            className="p-1 px-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition duration-150 flex items-center justify-center gap-1 mx-auto"
                            title="Revoke Credentials Action"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-[11px] text-amber-900 font-medium">
            <Info className="h-4.5 w-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-bold">Important Administration Notice:</span>
              <span>
                Dynamically registered accounts possess full context operations access inside their respective role classes. Revoking credentials will immediately render their session token invalid on next API call and output a secure system audit log action tag.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
