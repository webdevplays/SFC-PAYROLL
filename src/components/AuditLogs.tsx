/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Clock, FileWarning, ShieldAlert } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.user.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.timestamp.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Security Audit Logs</h1>
          <p className="text-slate-400 text-xs mt-1">
            Browse sequential automated entries logging system mutations, registrations, and account logins.
          </p>
        </div>

        {/* Search Audit log query input */}
        <div className="relative rounded-xl shadow-xs max-w-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log triggers, operators..."
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs font-medium"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-950">System Logs Timeline</h2>
          <p className="text-slate-400 text-xs mt-0.5">Automated timestamped registry records</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-450 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Incident Timestamp</th>
                <th className="px-5 py-3 text-left">Internal ID</th>
                <th className="px-5 py-3 text-left">Incident Operator</th>
                <th className="px-5 py-3 text-left">System Event Handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                    No matching logs found in registry.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="px-5 py-3.5 text-slate-400 font-mono flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono font-bold">{log.id}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 font-extrabold rounded-md uppercase text-[9px] ${
                        log.user === 'admin' ? 'bg-indigo-50 text-indigo-700' :
                        log.user === 'staff' ? 'bg-violet-50 text-violet-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {log.user}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-750 font-semibold font-sans leading-relaxed">
                      {log.action}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-[10px] font-semibold mt-2">
          <ShieldAlert className="h-4 w-4 text-slate-400 flex-shrink-0" id="shield-alert-logo" />
          <span>Notice: Audit ledger events trace physical manipulations securely, and entries are read-only and preserved for financial compliance parameters.</span>
        </div>
      </div>
    </div>
  );
};
