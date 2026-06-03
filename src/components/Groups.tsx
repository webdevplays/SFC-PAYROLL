/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Group } from '../types';
import { PlusCircle, List, Search, Edit3, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';

export const Groups: React.FC = () => {
  const { groups, employees, barangays, addGroup, updateGroup, deleteGroup, user } = useApp();

  // Internal visual tab
  const [subTab, setSubTab] = useState<'create' | 'list'>('list');

  // Form states
  const [groupName, setGroupName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [coLeaderIds, setCoLeaderIds] = useState<string[]>([]);
  const [rate, setRate] = useState('');
  const [barangayAssigned, setBarangayAssigned] = useState('');
  const [addressDesignated, setAddressDesignated] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Search and Pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [coLeaderSearch, setCoLeaderSearch] = useState('');

  // Filter leaders: only actual leaders, and only those not yet assigned to any group (except the current one being edited)
  const leadersList = employees
    .filter((e) => {
      const pos = e.position.toLowerCase();
      const isLeader = (pos.includes('leader') && !pos.includes('co-')) || pos.includes('lead') || pos.includes('supervisor');
      if (!isLeader) return false;
      
      const isAlreadyAssigned = groups.some((g) => g.leaderId === e.id && g.id !== editingId);
      return !isAlreadyAssigned;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Filter co-leaders: only actual co-leaders/surveyors/enumerators/etc. (excluding main leaders)
  const coLeadersList = employees
    .filter((e) => {
      const pos = e.position.toLowerCase();
      // Ensure we don't treat main leaders as co-leaders
      const isLeader = (pos.includes('leader') && !pos.includes('co-')) || pos.includes('lead') || pos.includes('supervisor');
      if (isLeader) return false;

      const isCo = pos.includes('co-') || pos.includes('surveyor') || pos.includes('enumerator') || pos.includes('others');
      return isCo;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const getBarangayFromAddress = (addr: string) => {
    if (!addr) return '';
    const cleanAddr = addr.toLowerCase().trim();
    
    // 1. Try exact match of the first comma-separated part first
    const parts = addr.split(',').map(p => p.trim());
    const firstPart = parts[0] ? parts[0].toLowerCase() : '';
    
    for (const b of barangays) {
      const bgyName = b.barangayName.toLowerCase().trim();
      if (bgyName === firstPart) {
        return b.barangayName;
      }
    }

    // 2. If no exact match on first part, try to find any known barangay name by sorting descending by length to avoid partial matches on shorter substrings
    const sortedBarangays = [...barangays].sort((a, b) => b.barangayName.length - a.barangayName.length);
    for (const b of sortedBarangays) {
      const bgyName = b.barangayName.toLowerCase().trim();
      if (bgyName && cleanAddr.includes(bgyName)) {
        return b.barangayName;
      }
    }
    
    // 3. Fallback to parsing by commas if no known barangay matches
    for (const part of parts) {
      const pLower = part.toLowerCase();
      if (pLower.includes('barangay') || pLower.includes('bgy')) {
        return part.replace(/\b(barangay|bgy)\b\.?/gi, '').trim();
      }
    }
    
    return parts[0] || '';
  };

  const finalCoLeadersList = coLeadersList;

  const searchedCoLeadersList = finalCoLeadersList.filter((e) => {
    const q = coLeaderSearch.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.address.toLowerCase().includes(q) ||
      coLeaderIds.includes(e.id)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !leaderId || !rate || !barangayAssigned) return;

    // Restriction check: No duplicate Leader Official on physical groups
    const duplicateLeaderGroup = groups.find((g) => g.leaderId === leaderId && g.id !== editingId);
    if (duplicateLeaderGroup) {
      const leaderName = employees.find((emp) => emp.id === leaderId)?.fullName || 'Selected Leader';
      setFormError(`Duplicate Assignment Blocked: "${leaderName}" is already the registered Leader of Group "${duplicateLeaderGroup.groupName}". A Leader can only lead one active field survey group.`);
      return;
    }

    const firstCoLeaderId = coLeaderIds[0] || '';

    if (editingId) {
      await updateGroup(editingId, {
        groupName,
        leaderId,
        coLeaderId: firstCoLeaderId,
        coLeaderIds,
        rate: Number(rate),
        barangayAssigned,
        addressDesignated,
        status
      });
      setEditingId(null);
    } else {
      await addGroup({
        groupName,
        leaderId,
        coLeaderId: firstCoLeaderId,
        coLeaderIds,
        rate: Number(rate),
        barangayAssigned,
        addressDesignated
      });
    }

    // Reset Form & Switch back
    clearForm();
    setSubTab('list');
  };

  const clearForm = () => {
    setGroupName('');
    setLeaderId('');
    setCoLeaderIds([]);
    setRate('');
    setBarangayAssigned('');
    setAddressDesignated('');
    setStatus('Active');
    setEditingId(null);
    setCoLeaderSearch('');
    setFormError('');
  };

  const handleEdit = (grp: Group) => {
    setEditingId(grp.id);
    setGroupName(grp.groupName);
    setLeaderId(grp.leaderId);
    setCoLeaderIds(grp.coLeaderIds || (grp.coLeaderId ? [grp.coLeaderId] : []));
    setRate(grp.rate.toString());
    setBarangayAssigned(grp.barangayAssigned);
    setAddressDesignated(grp.addressDesignated);
    setStatus(grp.status);
    setSubTab('create'); // Switch to form
  };

  const handleDelete = async (grp: Group) => {
    if (confirm(`Disband group ${grp.groupName} ? This action is tracked.`)) {
      await deleteGroup(grp.id);
      // Reset page down if empty
      const afterDelCount = groups.length - 1;
      if (afterDelCount > 0 && Math.ceil(afterDelCount / itemsPerPage) < currentPage) {
        setCurrentPage(Math.max(currentPage - 1, 1));
      }
    }
  };

  // Filter groups
  const filteredGroups = groups.filter((grp) => {
    const q = search.toLowerCase();
    const leader = employees.find((e) => e.id === grp.leaderId)?.fullName || '';
    
    const grcoLeaderIds = grp.coLeaderIds || (grp.coLeaderId ? [grp.coLeaderId] : []);
    const coLeadersNames = grcoLeaderIds.map(
      (id) => employees.find((e) => e.id === id)?.fullName || ''
    ).filter(Boolean).join(', ');

    return (
      grp.groupName.toLowerCase().includes(q) ||
      leader.toLowerCase().includes(q) ||
      coLeadersNames.toLowerCase().includes(q) ||
      grp.barangayAssigned.toLowerCase().includes(q) ||
      grp.id.toLowerCase().includes(q)
    );
  });

  // Pagianation boundary helpers
  const totalItems = filteredGroups.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Survey Groups</h1>
          <p className="text-slate-400 text-xs mt-1">
            Establish field operator teams, set assigned rates, and direct general survey regional areas.
          </p>
        </div>

        {/* Outer view toggle sub-tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => {
              setSubTab('list');
              if (!editingId) clearForm();
            }}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition ${
              subTab === 'list'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            Assigned Group List
          </button>
          <button
            onClick={() => setSubTab('create')}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition ${
              subTab === 'create'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            {editingId ? 'Edit Group parameters' : 'Create Group'}
          </button>
        </div>
      </div>

      {subTab === 'create' ? (
        /* Create/Edit Form */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm max-w-2xl">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            {editingId ? `Amend Group Parameters ID: ${editingId}` : 'Assemble New Field Survey Group'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Group Profile Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Unit Alpha Segment"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="Survey Group Base Compensation Multiplier block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Base Rate (PHP per interview)
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 15"
                  min={1}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Survey Leader
                </label>
                <select
                  value={leaderId}
                  onChange={(e) => {
                    setLeaderId(e.target.value);
                    setFormError('');
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                >
                  <option value="">Select official Leader...</option>
                  {leadersList.length === 0 ? (
                    <option disabled value="">No unassigned Survey Leaders available</option>
                  ) : (
                    leadersList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.id})
                      </option>
                    ))
                  )}
                </select>
                {formError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{formError}</span>
                  </p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Survey Co-Leaders (Select Multiple - Optional)
                    </label>
                  </div>
                  {coLeaderIds.length > 0 && (
                    <span className="text-[10px] text-indigo-600 font-semibold font-sans bg-indigo-50 px-2 py-0.5 rounded-full">
                      {coLeaderIds.length} selected
                    </span>
                  )}
                </div>

                {/* Inline Search Bar for Co-Leaders */}
                <div className="relative mb-2">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={coLeaderSearch}
                    onChange={(e) => setCoLeaderSearch(e.target.value)}
                    placeholder="Search co-leaders by name, ID, or position..."
                    className="w-full pl-9 pr-8 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder-slate-400 bg-white"
                  />
                  {coLeaderSearch && (
                    <button
                      type="button"
                      onClick={() => setCoLeaderSearch('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] text-slate-400 hover:text-slate-650 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50">
                  {searchedCoLeadersList.length === 0 ? (
                    <div className="col-span-2 text-slate-400 text-xs italic p-1">
                      {coLeaderSearch ? "No matching co-leaders found for your search." : "No Co-Leaders found in database."}
                    </div>
                  ) : (
                    searchedCoLeadersList.map((e) => {
                      const isChecked = coLeaderIds.includes(e.id);
                      return (
                        <label
                          key={e.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                              : 'bg-white border-slate-100 hover:border-slate-200 text-slate-650'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCoLeaderIds(coLeaderIds.filter((id) => id !== e.id));
                              } else {
                                setCoLeaderIds([...coLeaderIds, e.id]);
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-200"
                          />
                          <span>
                            {e.fullName} <span className="text-[10px] text-slate-400 font-mono">({e.id})</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Barangay Assignment Zone
                </label>
                <select
                  value={barangayAssigned}
                  onChange={(e) => setBarangayAssigned(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                >
                  <option value="">Select assigned sectors...</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.barangayName}>
                      {b.barangayName} ({b.municipality})
                    </option>
                  ))}
                </select>
              </div>

              {editingId && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Operating Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  >
                    <option value="Active">Active Team</option>
                    <option value="Inactive">Inactive / Rested</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Specific Sector Address Designated
              </label>
              <textarea
                value={addressDesignated}
                onChange={(e) => setAddressDesignated(e.target.value)}
                placeholder="e.g. Zones 4, 5, and Riversides block coordinates..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex p-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition gap-2 items-center justify-center min-w-[130px]"
              >
                <CheckCircle className="h-4 w-4" />
                {editingId ? 'Save Changes' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setSubTab('list');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-5 py-3 rounded-xl transition"
              >
                Back to List
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Team assigned List with pagination and search option */
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Assigned Field Survey Groups</h2>
              <p className="text-slate-400 text-xs mt-0.5">Assigned leaders, base compensations, and regional assignments</p>
            </div>

            <div className="relative rounded-xl shadow-xs max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // restart
                }}
                placeholder="Search group name, leader, coleader..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Group Designation</th>
                  <th className="px-4 py-3 text-left">Leader Official</th>
                  <th className="px-4 py-3 text-left">Co-Leaders Assigned</th>
                  <th className="px-4 py-3 text-left">Base Rate / Int</th>
                  <th className="px-4 py-3 text-left">Zone Barangay</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                      No matching survey group rosters registered.
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((grp) => {
                    const ldr = employees.find((e) => e.id === grp.leaderId);
                    
                    const grpCoLeaderIds = grp.coLeaderIds || (grp.coLeaderId ? [grp.coLeaderId] : []);
                    const coLeadersNamesStr = grpCoLeaderIds
                      .map((id) => employees.find((e) => e.id === id)?.fullName)
                      .filter(Boolean)
                      .join(', ') || 'None';

                    return (
                      <tr key={grp.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-4 py-3 text-indigo-600 font-bold font-mono">{grp.id}</td>
                        <td className="px-4 py-3 text-slate-950 font-bold">
                          {grp.groupName}
                          {grp.addressDesignated && (
                            <span className="block font-normal text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                              {grp.addressDesignated}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-bold">{ldr ? ldr.fullName : 'Ghost Record'}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {grpCoLeaderIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {grpCoLeaderIds.map((id) => {
                                const emp = employees.find((e) => e.id === id);
                                if (!emp) return null;
                                return (
                                  <span key={id} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                    {emp.fullName}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No co-leaders</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{grp.rate} PHP</td>
                        <td className="px-4 py-3 font-semibold text-indigo-950">{grp.barangayAssigned}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            grp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {grp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(grp)}
                              className="p-1 px-2 rounded-lg border border-slate-150 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition duration-150"
                              title="Edit"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {user?.role === 'Admin' ? (
                              <button
                                onClick={() => handleDelete(grp)}
                                className="p-1 px-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition duration-150"
                                title="Disband Group"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-1 px-2 rounded-lg border border-slate-100 text-slate-350 opacity-45 cursor-not-allowed"
                                title="Admin Privilege Required"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-semibold">
              <span className="text-slate-400">
                Displaying {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} teams
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-45"
                >
                  Prev
                </button>
                <div className="flex items-center font-mono text-slate-500 px-1">
                  {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-45"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {user?.role !== 'Admin' && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-[11px] font-medium mt-2">
              <ShieldAlert className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>Privilege warning: Disbranding or deleting registered survey groups requires Admin permissions credentials.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
