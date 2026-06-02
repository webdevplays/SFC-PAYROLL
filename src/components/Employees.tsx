/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { Plus, Search, Edit3, Trash2, ShieldAlert, Check } from 'lucide-react';

export const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, user, barangays } = useApp();
  
  // States
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !position || !address) return;

    if (editingId) {
      await updateEmployee(editingId, { fullName, position, address });
      setEditingId(null);
    } else {
      await addEmployee({ fullName, position, address });
    }

    // Reset Form
    setFullName('');
    setPosition('');
    setAddress('');
  };

  // Trigger edit mode
  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFullName(emp.fullName);
    setPosition(emp.position);
    setAddress(emp.address);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFullName('');
    setPosition('');
    setAddress('');
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">Manage Employees</h1>
        <p className="text-slate-400 text-xs mt-1">
          Register new field survey operators and edit their official roles in payroll.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form (1/3 Width) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm self-start">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            {editingId ? 'Edit Employee Record' : 'Register New Employee'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Official Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              >
                <option value="">Select official role...</option>
                <option value="Leader">Leader</option>
                <option value="Co-Leader">Co-Leader</option>
                <option value="Others-Surveyor">Others (Surveyor)</option>
                <option value="Others-Supervisor">Others (Supervisor)</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Residential Address (Fetched from Barangays)
              </label>
              <select
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              >
                <option value="">Select pre-registered Barangay...</option>
                {barangays.map((b) => {
                  const fullAddr = `${b.barangayName}, ${b.municipality}, ${b.province}`;
                  return (
                    <option key={b.id} value={fullAddr}>
                      {b.barangayName}, {b.municipality}, {b.province}
                    </option>
                  );
                })}
                {/* Fallback option for current custom/legacy address if it's not empty and not in the list */}
                {address && !barangays.some(b => `${b.barangayName}, ${b.municipality}, ${b.province}` === address) && (
                  <option value={address}>{address}</option>
                )}
              </select>
              {barangays.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1.5">
                  ⚠️ No pre-registered Barangay sectors found. Please register them in the Barangay Sectors tab.
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm"
              >
                {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? 'Apply Changes' : 'Add Employee'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition duration-150"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Database Grid view (2/3 Width) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Employee Records Ledger</h2>
              <p className="text-slate-400 text-xs mt-0.5">List of active surveyors in database</p>
            </div>

            {/* Search filter input */}
            <div className="relative rounded-xl shadow-xs max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or role..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Full Name</th>
                  <th className="px-4 py-3 text-left">Role Position</th>
                  <th className="px-4 py-3 text-left">Home Designation</th>
                  <th className="px-4 py-3 text-left">Date Added</th>
                  <th className="px-4 py-3 text-center min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                      No matching employee records found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-4 py-3 text-indigo-600 font-bold font-mono">{emp.id}</td>
                      <td className="px-4 py-3 text-slate-950 font-bold">{emp.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.position === 'Leader' || (emp.position.includes('Leader') && !emp.position.toLowerCase().includes('co-'))
                            ? 'bg-indigo-50 text-indigo-700'
                            : emp.position === 'Co-Leader' || emp.position.includes('Co-Leader')
                            ? 'bg-sky-50 text-sky-700'
                            : emp.position.includes('Supervisor')
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{emp.address}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{emp.createdDate}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-1 px-2 rounded-lg border border-slate-150 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition duration-150"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Protect deletion on Admin scope check if wanted, we enforce role restrictions gracefully */}
                          {user?.role === 'Admin' ? (
                            <button
                              onClick={() => {
                                if (confirm(`Remove employee ${emp.fullName}? This can trigger group cascades.`)) {
                                  deleteEmployee(emp.id);
                                }
                              }}
                              className="p-1 px-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition duration-150"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1 px-2 rounded-lg border border-slate-100 text-slate-350 opacity-55 cursor-not-allowed"
                              title="Admin Authentication Required"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {user?.role !== 'Admin' && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-[11px] font-medium">
              <ShieldAlert className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>Security notice: Staff users can add/edit metadata, but database deletion requires Admin privilege parameters.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
