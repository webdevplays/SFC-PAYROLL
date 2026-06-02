/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Barangay } from '../types';
import { Plus, Search, Edit3, Trash2, Check, ShieldAlert } from 'lucide-react';

export const Barangays: React.FC = () => {
  const { barangays, addBarangay, updateBarangay, deleteBarangay, user } = useApp();

  const [barangayName, setBarangayName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [province, setProvince] = useState('');

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangayName || !municipality || !province) return;

    if (editingId) {
      await updateBarangay(editingId, { barangayName, municipality, province });
      setEditingId(null);
    } else {
      await addBarangay({ barangayName, municipality, province });
    }

    setBarangayName('');
    setMunicipality('');
    setProvince('');
  };

  const handleEdit = (bgy: Barangay) => {
    setEditingId(bgy.id);
    setBarangayName(bgy.barangayName);
    setMunicipality(bgy.municipality);
    setProvince(bgy.province);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setBarangayName('');
    setMunicipality('');
    setProvince('');
  };

  const filteredBarangays = barangays.filter((bgy) => {
    const q = search.toLowerCase();
    return (
      bgy.barangayName.toLowerCase().includes(q) ||
      bgy.municipality.toLowerCase().includes(q) ||
      bgy.province.toLowerCase().includes(q) ||
      bgy.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">Barangay Sectors</h1>
        <p className="text-slate-400 text-xs mt-1">
          Configure administrative sector categories and assign designated regional boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm self-start">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            {editingId ? 'Edit Barangay Sector' : 'Add New Sector'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Barangay Name
              </label>
              <input
                type="text"
                value={barangayName}
                onChange={(e) => setBarangayName(e.target.value)}
                placeholder="e.g. Barangay San Jose"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Municipality / City
              </label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="e.g. Quezon City"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Province Office
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="e.g. Metro Manila"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm"
              >
                {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? 'Modify Sector' : 'Add Sector'}
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

        {/* Database list view */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Active Barangay Database</h2>
              <p className="text-slate-400 text-xs mt-0.5">List of designated surveys boundaries</p>
            </div>

            <div className="relative rounded-xl shadow-xs max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sector, city or ID..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Barangay Name</th>
                  <th className="px-4 py-3 text-left">Municipality / City</th>
                  <th className="px-4 py-3 text-left">Province</th>
                  <th className="px-4 py-3 text-left">Created Date</th>
                  <th className="px-4 py-3 text-center min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBarangays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                      No matching barangays found in ledger.
                    </td>
                  </tr>
                ) : (
                  filteredBarangays.map((bgy) => (
                    <tr key={bgy.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-4 py-3 text-indigo-600 font-bold font-mono">{bgy.id}</td>
                      <td className="px-4 py-3 text-slate-950 font-bold">{bgy.barangayName}</td>
                      <td className="px-4 py-3 text-slate-700">{bgy.municipality}</td>
                      <td className="px-4 py-3 text-slate-600">{bgy.province}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{bgy.createdDate}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(bgy)}
                            className="p-1 px-2 rounded-lg border border-slate-150 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition duration-150"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {user?.role === 'Admin' ? (
                            <button
                              onClick={() => {
                                if (confirm(`Delete sector ${bgy.barangayName} from system?`)) {
                                  deleteBarangay(bgy.id);
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
                              title="Admin Privilege Required"
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
              <span>Privilege warning: Removing regional barangays from list requires Admin login state clearance.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
