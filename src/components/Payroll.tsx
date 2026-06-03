/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Group, Survey, Employee } from '../types';
import { PlusCircle, Search, Edit3, Trash2, Calendar, FileText, Check, AlertCircle, Sparkles } from 'lucide-react';

export const Payroll: React.FC = () => {
  const { surveys, groups, employees, barangays, addSurvey, updateSurvey, deleteSurvey, user } = useApp();

  // Internal visual toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [populationCount, setPopulationCount] = useState('');
  const [groupRate, setGroupRate] = useState<number>(0);

  // Auto-fetched properties
  const [autoGroup, setAutoGroup] = useState<Group | null>(null);
  const [autoLeader, setAutoLeader] = useState<Employee | null>(null);
  const [autoCoLeaders, setAutoCoLeaders] = useState<Employee[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Helper to sync surveyor team profiles and rates from a given group
  const updateAutoDetails = (group: Group) => {
    setAutoGroup(group);
    
    const leader = employees.find((e) => e.id === group.leaderId);
    const coLdrIds = group.coLeaderIds || (group.coLeaderId ? [group.coLeaderId] : []);
    const coLeaders = coLdrIds.map((id) => employees.find((e) => e.id === id)).filter((e): e is Employee => !!e);

    if (leader) setAutoLeader(leader);
    else setAutoLeader(null);
    setAutoCoLeaders(coLeaders);
  };

  // 1. Manual or assisted change handlers
  const handleBarangayChange = (barangayName: string) => {
    setSelectedBarangay(barangayName);
    
    if (!barangayName) {
      setSelectedGroupId('');
      setGroupRate(0);
      setAutoGroup(null);
      setAutoLeader(null);
      setAutoCoLeaders([]);
      return;
    }

    // Find active group assigned to this Barangay
    const groupJoined = groups.find(
      (g) => g.barangayAssigned === barangayName && g.status === 'Active'
    );

    if (groupJoined) {
      setSelectedGroupId(groupJoined.id);
      setGroupRate(groupJoined.rate);
      updateAutoDetails(groupJoined);
    } else {
      // Zero-out details if no active group matches, but allow manual selection
      setSelectedGroupId('');
      setGroupRate(0);
      setAutoGroup(null);
      setAutoLeader(null);
      setAutoCoLeaders([]);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    
    if (!groupId) {
      setGroupRate(0);
      setAutoGroup(null);
      setAutoLeader(null);
      setAutoCoLeaders([]);
      return;
    }

    const groupJoined = groups.find((g) => g.id === groupId);
    if (groupJoined) {
      setGroupRate(groupJoined.rate);
      updateAutoDetails(groupJoined);
      
      // Smart Auto-select Barangay matching that group
      if (groupJoined.barangayAssigned) {
        setSelectedBarangay(groupJoined.barangayAssigned);
      }
    }
  };

  // Submit new survey
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !selectedBarangay || !selectedGroupId || !populationCount || groupRate <= 0) return;

    if (editingId) {
      await updateSurvey(editingId, {
        date,
        barangay: selectedBarangay,
        groupId: selectedGroupId,
        populationCount: Number(populationCount),
        rate: groupRate
      });
      setEditingId(null);
    } else {
      await addSurvey({
        date,
        barangay: selectedBarangay,
        groupId: selectedGroupId,
        populationCount: Number(populationCount),
        rate: groupRate
      });
    }

    // Reset parameters
    clearForm();
    setIsFormOpen(false);
  };

  const clearForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedBarangay('');
    setSelectedGroupId('');
    setPopulationCount('');
    setGroupRate(0);
    setEditingId(null);
    setAutoGroup(null);
    setAutoLeader(null);
    setAutoCoLeaders([]);
  };

  const handleEdit = (srv: Survey) => {
    setEditingId(srv.id);
    setDate(srv.date);
    setSelectedBarangay(srv.barangay);
    setSelectedGroupId(srv.groupId);
    setPopulationCount(srv.populationCount.toString());
    setGroupRate(srv.rate);
    setIsFormOpen(true); // Open block

    const group = groups.find((g) => g.id === srv.groupId);
    if (group) {
      updateAutoDetails(group);
    } else {
      setAutoGroup(null);
      setAutoLeader(null);
      setAutoCoLeaders([]);
    }
  };

  // Calculations
  const calculatedTotalPayout = Number(populationCount || 0) * groupRate;

  // Filter Active surveys with multi-metric query
  const filteredSurveys = surveys.filter((srv) => {
    const q = search.toLowerCase();
    
    // Get group name to search
    const parentGroup = groups.find((g) => g.id === srv.groupId);
    const grpleName = parentGroup ? parentGroup.groupName : '';
    const ldrName = parentGroup ? (employees.find((e) => e.id === parentGroup.leaderId)?.fullName || '') : '';
    
    let coLdrNamesStr = '';
    if (parentGroup) {
      const coLdrIds = parentGroup.coLeaderIds || (parentGroup.coLeaderId ? [parentGroup.coLeaderId] : []);
      coLdrNamesStr = coLdrIds.map((id) => employees.find((e) => e.id === id)?.fullName || '').filter(Boolean).join(', ');
    }

    const matchesSearch =
      srv.id.toLowerCase().includes(q) ||
      srv.barangay.toLowerCase().includes(q) ||
      grpleName.toLowerCase().includes(q) ||
      ldrName.toLowerCase().includes(q) ||
      coLdrNamesStr.toLowerCase().includes(q);

    const matchesFromDate = fromDateFilter ? srv.date >= fromDateFilter : true;
    const matchesToDate = toDateFilter ? srv.date <= toDateFilter : true;

    return matchesSearch && matchesFromDate && matchesToDate;
  });

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Active Survey Payroll</h1>
          <p className="text-slate-400 text-xs mt-1">
            Log raw population indexes, review payouts, and prepare accounts for periodic settlement.
          </p>
        </div>

        {/* Primary Toggle Form Trigger */}
        {!isFormOpen && (
          <button
            onClick={() => {
              clearForm();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-500 self-start sm:self-auto transition-transform active:scale-95 duration-100"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            Add Survey Entry
          </button>
        )}
      </div>

      {isFormOpen && (
        /* Create Survey Collapsible Entry Block */
        <div className="bg-white border border-indigo-100/50 rounded-3xl p-6 shadow-md shadow-indigo-50 max-w-3xl">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
            {editingId ? `Amend Survey Log ID: ${editingId}` : 'Assemble Survey Entry Details'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Survey Conduct Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Barangay Area Sector
                </label>
                <select
                  value={selectedBarangay}
                  onChange={(e) => handleBarangayChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  required
                >
                  <option value="">Select Barangay Area...</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.barangayName}>
                      {b.barangayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Leaders Name base on Barangay Area Sector
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  required
                >
                  <option value="">Select Leader Name...</option>
                  {(selectedBarangay ? groups.filter((g) => g.barangayAssigned === selectedBarangay) : groups).map((g) => {
                    const ldr = employees.find((e) => e.id === g.leaderId);
                    const ldrName = ldr ? ldr.fullName : 'No Leader Assigned';
                    return (
                      <option key={g.id} value={g.id}>
                        {ldrName} ({g.groupName})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Population Counted (Input)
                </label>
                <input
                  type="number"
                  value={populationCount}
                  onChange={(e) => setPopulationCount(e.target.value)}
                  placeholder="e.g. 235"
                  min={1}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Auto Fetched Team Context Panel */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Auto-Fetched Team Context Profile
              </span>

              {selectedBarangay && !autoGroup ? (
                <div className="flex items-center gap-2.5 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100 font-medium mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>No active survey group is currently designated to {selectedBarangay}. Establish team assignments under groups tab first.</span>
                </div>
              ) : selectedBarangay && autoGroup ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-normal">Assigned Group</span>
                    <span className="text-slate-950 font-bold text-sm block mt-0.5">{autoGroup.groupName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-normal">Survey Leader</span>
                    <span className="text-slate-800 block mt-0.5">{autoLeader ? autoLeader.fullName : 'None'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-normal">Co-Leaders Assigned</span>
                    <span className="text-slate-800 block mt-0.5 font-semibold">
                      {autoCoLeaders.length > 0 ? autoCoLeaders.map(c => c.fullName).join(', ') : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-normal">Assigned Rate</span>
                    <span className="text-indigo-600 font-bold block mt-0.5 font-mono text-sm">{groupRate} PHP</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium italic">
                  Select a Barangay sector above to populate surveyors.
                </div>
              )}
            </div>

            {/* Calculations payout summary */}
            {selectedBarangay && autoGroup && (
              <div className="flex items-center justify-between p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div>
                  <span className="block text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Calculated survey sum payout</span>
                  <span className="text-xs text-indigo-750 font-medium">{populationCount || '0'} interviews mapped × {groupRate} PHP rate</span>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-black text-indigo-950 font-mono">
                    {calculatedTotalPayout.toLocaleString()} PHP
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!selectedBarangay || !autoGroup || !populationCount}
                className="flex py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition gap-2 items-center justify-center min-w-[130px] disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4" />
                {editingId ? 'Save Survey Changes' : 'Submit Survey Entry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setIsFormOpen(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-5 py-3 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main ledger list view with search and date filters */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 pb-2 border-b border-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-950">Active Surveys Log</h2>
            <p className="text-slate-400 text-xs mt-0.5">Unsettled survey payroll records. Use Settlement to clear balances.</p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center max-w-3xl w-full xl:justify-end">
            {/* Date Filters */}
            <div className="flex items-center gap-2 border border-slate-200 p-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={fromDateFilter}
                onChange={(e) => setFromDateFilter(e.target.value)}
                className="bg-transparent focus:outline-none font-medium text-slate-800"
                placeholder="From"
                title="From Date Filter"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
                className="bg-transparent focus:outline-none font-medium text-slate-800"
                placeholder="To"
                title="To Date Filter"
              />
              {(fromDateFilter || toDateFilter) && (
                <button
                  onClick={() => {
                    setFromDateFilter('');
                    setToDateFilter('');
                  }}
                  className="px-1 text-[10px] text-rose-500 hover:bg-rose-50 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>

            {/* General Search */}
            <div className="relative rounded-xl shadow-xs max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search surveyor, zone or ID..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* surveys Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Assigned Group</th>
                <th className="px-4 py-3 text-left">Assigned Leader</th>
                <th className="px-4 py-3 text-left">Regional Zone</th>
                <th className="px-4 py-3 text-left">Pop. Count</th>
                <th className="px-4 py-3 text-left">Rate / Unit</th>
                <th className="px-4 py-3 text-left">Gross payout</th>
                <th className="px-4 py-3 text-center min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                    No active survey logs matching filters found.
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((srv) => {
                  const grp = groups.find((g) => g.id === srv.groupId);
                  const ldr = grp ? employees.find((e) => e.id === grp.leaderId) : null;
                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">{srv.date}</td>
                      <td className="px-4 py-3 text-indigo-600 font-bold font-mono">{srv.id}</td>
                      <td className="px-4 py-3 text-slate-950 font-black">{grp ? grp.groupName : 'Ghost Group'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{ldr ? ldr.fullName : 'Ghost Leader'}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-950">{srv.barangay}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{srv.populationCount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">{srv.rate} PHP</td>
                      <td className="px-4 py-3 font-mono font-black text-indigo-900">{srv.totalPayout.toLocaleString()} PHP</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(srv)}
                            className="p-1 px-2 rounded-lg border border-slate-150 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition duration-150"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove survey log ID: ${srv.id}? This will restore uncommitted balances.`)) {
                                deleteSurvey(srv.id);
                              }
                            }}
                            className="p-1 px-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition duration-150"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregated Payout Block */}
        {filteredSurveys.length > 0 && (
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <span className="font-bold text-slate-500">Filtered Payroll Sum Value:</span>
            <span className="font-mono font-black text-indigo-950 text-sm">
              {filteredSurveys.reduce((sum, s) => sum + s.totalPayout, 0).toLocaleString()} PHP (across {filteredSurveys.length} survey entries)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
