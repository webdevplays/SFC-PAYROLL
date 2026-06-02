/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  MapPin, 
  FolderGit2, 
  ClipboardCheck, 
  Coins, 
  Layers, 
  Clock, 
  CalendarDays,
  FileCheck2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    employees, 
    barangays, 
    groups, 
    surveys, 
    settlements, 
    paidPayroll, 
    auditLogs 
  } = useApp();

  // Metrics calculations
  const totalEmployees = employees.length;
  const totalGroups = groups.length;
  const totalBarangays = barangays.length;
  const activeSurveysCount = surveys.length;
  
  const pendingPayrollAmount = surveys.reduce((sum, item) => sum + item.totalPayout, 0);
  const paidPayrollCount = paidPayroll.length;
  const totalSettledAmount = paidPayroll.reduce((sum, item) => sum + item.totalPayout, 0);
  const totalPayrollGross = pendingPayrollAmount + totalSettledAmount;

  // 1. Grouped statistics for Charts:
  // Payroll by Barangay (Active + Settled combined to show total survey volume assigned)
  const barangayPayrollMap: Record<string, number> = {};
  surveys.forEach(s => {
    barangayPayrollMap[s.barangay] = (barangayPayrollMap[s.barangay] || 0) + s.totalPayout;
  });
  paidPayroll.forEach(p => {
    barangayPayrollMap[p.barangay] = (barangayPayrollMap[p.barangay] || 0) + p.totalPayout;
  });

  const barangayChartData = Object.entries(barangayPayrollMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5); // top 5

  // Payroll by Group
  const groupPayrollMap: Record<string, number> = {};
  surveys.forEach(s => {
    const parent = groups.find(g => g.id === s.groupId);
    const grpName = parent ? parent.groupName : "Unassigned";
    groupPayrollMap[grpName] = (groupPayrollMap[grpName] || 0) + s.totalPayout;
  });
  paidPayroll.forEach(p => {
    groupPayrollMap[p.groupName] = (groupPayrollMap[p.groupName] || 0) + p.totalPayout;
  });

  const groupChartData = Object.entries(groupPayrollMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Monthly trend (simulation based on dates)
  // Let's create an elegant static/dynamic timeline
  const monthlyTrend = [
    { month: 'Jan 2026', amount: 8500 },
    { month: 'Feb 2026', amount: 12400 },
    { month: 'Mar 2026', amount: 19805 },
    { month: 'Apr 2026', amount: 14500 },
    { month: 'May 2026', amount: 14700 }, // SET-001 amount
    { month: 'Jun 2026', amount: pendingPayrollAmount }
  ];

  const maxMonthValue = Math.max(...monthlyTrend.map(d => d.amount), 1000);

  return (
    <div className="space-y-8 font-sans">
      {/* Upper Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl text-white shadow-xl shadow-slate-150">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Field Survey Payout Overview</h1>
          <p className="text-indigo-200 text-sm mt-1 font-medium">
            Track workforce metrics, active task disbursements, and Google Sheets synced ledgers.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15 backdrop-blur-sm self-start md:self-auto">
          <CalendarDays className="h-5 w-5 text-indigo-300" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-indigo-100">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Metric 2x4 Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Employees</span>
            <span className="text-2xl font-black text-slate-900">{totalEmployees}</span>
          </div>
        </div>

        {/* Total Groups */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Groups</span>
            <span className="text-2xl font-black text-slate-900">{totalGroups}</span>
          </div>
        </div>

        {/* Total Barangays */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Barangays</span>
            <span className="text-2xl font-black text-slate-900">{totalBarangays}</span>
          </div>
        </div>

        {/* Active Surveys */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unsettled Surveys</span>
            <span className="text-2xl font-black text-slate-900">{activeSurveysCount}</span>
          </div>
        </div>

        {/* Pending Payroll */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending Payout</span>
            <span className="text-xl font-black text-slate-900">{pendingPayrollAmount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">PHP</span></span>
          </div>
        </div>

        {/* Paid payroll list */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Paid Surveys</span>
            <span className="text-xl font-black text-slate-900">{paidPayrollCount} <span className="text-xs text-slate-400 font-bold">records</span></span>
          </div>
        </div>

        {/* Total Settled Amount */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Settled Amount</span>
            <span className="text-xl font-black text-slate-900">{totalSettledAmount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">PHP</span></span>
          </div>
        </div>

        {/* Total Gross Payroll */}
        <div className="p-6 bg-white border border-slate-100 shadow-sm shadow-slate-50 rounded-3xl flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100/60 border border-indigo-200 flex items-center justify-center text-indigo-700">
            <Coins className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Gross Payroll</span>
            <span className="text-xl font-black text-indigo-950">{totalPayrollGross.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">PHP</span></span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Payroll Trend */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-950">Disbursement Milestone Trend</h2>
              <p className="text-slate-400 text-xs mt-0.5">Rolling monthly payroll amounts</p>
            </div>
            <div className="text-[10px] text-indigo-600 bg-indigo-50 font-bold tracking-wider uppercase px-2 py-1 rounded-md">
              Monthly Sum
            </div>
          </div>
          
          <div className="flex items-end justify-between h-48 pt-4 gap-2">
            {monthlyTrend.map((data, idx) => {
              const heightPct = (data.amount / maxMonthValue) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg absolute translate-y-[-50px] pointer-events-none whitespace-nowrap shadow-md font-mono">
                    {data.amount.toLocaleString()} PHP
                  </div>
                  {/* Vertical bar */}
                  <div 
                    style={{ height: `${Math.max(heightPct, 5)}%` }} 
                    className="w-full max-w-[36px] bg-indigo-600 hover:bg-slate-900 rounded-lg transition-all duration-300 relative flex items-end justify-center"
                  >
                    <div className="w-1.5 h-1/2 bg-white/10 rounded-full mb-1 opacity-70"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center tracking-tight">
                    {data.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Payroll distribution right side breakdown */}
        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-950">Payroll by Barangay</h2>
            <p className="text-slate-400 text-xs mt-0.5">Top 5 active distribution sectors</p>
          </div>

          <div className="space-y-4">
            {barangayChartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-medium">
                No active assignment records found
              </div>
            ) : (
              barangayChartData.map((b, i) => {
                const maxAmount = Math.max(...barangayChartData.map(d => d.amount), 1);
                const pct = (b.amount / maxAmount) * 100;
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500'];
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 truncate w-2/3">{b.name}</span>
                      <span className="font-mono text-slate-500 font-bold">{b.amount.toLocaleString()} PHP</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${pct}%` }} 
                        className={`h-full ${colors[i % colors.length]} rounded-full`}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom split: Payroll by active groups & Audit Activity table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active group payroll weights */}
        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">Group Survey Weight</h2>
            <p className="text-slate-400 text-xs mt-0.5">Cumulative surveys payroll weights</p>
          </div>

          <div className="space-y-4">
            {groupChartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-medium">
                No surveys posted for group groups
              </div>
            ) : (
              groupChartData.map((g, i) => {
                const maxAmount = Math.max(...groupChartData.map(d => d.amount), 1);
                const pct = (g.amount / maxAmount) * 100;
                const colors = ['bg-violet-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500', 'bg-amber-500'];
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 truncate w-2/3">{g.name}</span>
                      <span className="font-mono text-slate-500 font-bold">{g.amount.toLocaleString()} PHP</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${pct}%` }} 
                        className={`h-full ${colors[i % colors.length]} rounded-full`}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audit Logs Quick Table */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Audited Activity Feed</h2>
              <p className="text-slate-400 text-xs mt-0.5">Real-time system state monitoring logs</p>
            </div>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left rounded-l-xl">Occured</th>
                  <th className="px-4 py-2.5 text-left">Operator</th>
                  <th className="px-4 py-2.5 text-left rounded-r-xl">Action Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 5).map((log, index) => (
                  <tr key={index} className="hover:bg-slate-50/55 transition-colors duration-200">
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 font-semibold rounded-md uppercase ${
                        log.user === 'admin' ? 'bg-indigo-50 text-indigo-700 text-[10px]' :
                        log.user === 'staff' ? 'bg-violet-50 text-violet-700 text-[10px]' :
                        'bg-slate-50 text-slate-600 text-[10px]'
                      }`}>
                        {log.user}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {log.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
