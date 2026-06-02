/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, FileSpreadsheet, Group, MapPin, Receipt, Share2, BarChart3, TrendingUp } from 'lucide-react';

export const Reports: React.FC = () => {
  const { surveys, paidPayroll, groups, barangays, settlements } = useApp();
  const [selectedReportType, setSelectedReportType] = useState<'payroll' | 'settlement' | 'group' | 'barangay'>('payroll');

  // Math Helpers
  const totalActivePayout = surveys.reduce((sum, s) => sum + s.totalPayout, 0);
  const totalPaidPayout = paidPayroll.reduce((sum, p) => sum + p.totalPayout, 0);
  const totalCombinedGross = totalActivePayout + totalPaidPayout;

  // 1. Group Breakdown Calculations
  const groupReportsData = groups.map(g => {
    // Math active surveys
    const activeRows = surveys.filter(s => s.groupId === g.id);
    const activeSum = activeRows.reduce((a, b) => a + b.totalPayout, 0);
    const activePop = activeRows.reduce((a, b) => a + b.populationCount, 0);

    // Math paid surveys
    const paidRows = paidPayroll.filter(p => p.groupName === g.groupName);
    const paidSum = paidRows.reduce((a, b) => a + b.totalPayout, 0);
    const paidPop = paidRows.reduce((a, b) => a + b.populationCount, 0);

    return {
      id: g.id,
      name: g.groupName,
      rate: g.rate,
      status: g.status,
      activeSurveysCount: activeRows.length,
      activePayout: activeSum,
      paidSurveysCount: paidRows.length,
      paidPayout: paidSum,
      totalPopCount: activePop + paidPop,
      totalPayoutGross: activeSum + paidSum
    };
  });

  // 2. Barangay Breakdown Calculations
  const barangayReportsData = barangays.map(b => {
    const activeRows = surveys.filter(s => s.barangay === b.barangayName);
    const activeSum = activeRows.reduce((sum, s) => sum + s.totalPayout, 0);

    const paidRows = paidPayroll.filter(p => p.barangay === b.barangayName);
    const paidSum = paidRows.reduce((sum, p) => sum + p.totalPayout, 0);

    return {
      id: b.id,
      name: b.barangayName,
      city: b.municipality,
      province: b.province,
      activeSurveys: activeRows.length,
      activeAmount: activeSum,
      paidSurveys: paidRows.length,
      paidAmount: paidSum,
      totalSurveys: activeRows.length + paidRows.length,
      totalAmount: activeSum + paidSum
    };
  });

  // EXPORT PROCESSOR (Real CSV Generator based on active parameters)
  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";

    if (selectedReportType === 'payroll') {
      fileName = "Active_Survey_Payroll_Report";
      const fileHeaders = ["Date", "Survey ID", "Barangay Zone", "Group ID", "Population Count", "Rate (PHP)", "Payout Gross (PHP)"];
      const fileRows = surveys.map(s => [s.date, s.id, `"${s.barangay}"`, s.groupId, s.populationCount, s.rate, s.totalPayout].join(','));
      csvContent = [fileHeaders.join(','), ...fileRows].join('\n');
    } 
    else if (selectedReportType === 'settlement') {
      fileName = "Account_Historical_Settlements_Report";
      const fileHeaders = ["ID", "Settlement Approval Date", "From Date Coverage", "To Date Coverage", "Aggregate Total Approved PHP", "System Remarks"];
      const fileRows = settlements.map(s => [s.id, s.settlementDate, s.fromDate, s.toDate, s.totalAmount, `"${s.remarks.replace(/"/g, '""')}"`].join(','));
      csvContent = [fileHeaders.join(','), ...fileRows].join('\n');
    }
    else if (selectedReportType === 'group') {
      fileName = "Workgroups_Productivity_Payroll_Report";
      const fileHeaders = ["Group ID", "Group Name", "Base Rate PHP", "Team Status", "Active Surveys Block", "Active Payout PHP", "Paid Surveys Block", "Paid Payout PHP", "Aggregate Interviews", "Gross Earnings PHP"];
      const fileRows = groupReportsData.map(g => [g.id, `"${g.name}"`, g.rate, g.status, g.activeSurveysCount, g.activePayout, g.paidSurveysCount, g.paidPayout, g.totalPopCount, g.totalPayoutGross].join(','));
      csvContent = [fileHeaders.join(','), ...fileRows].join('\n');
    }
    else if (selectedReportType === 'barangay') {
      fileName = "Regional_Barangay_Coverage_Report";
      const fileHeaders = ["Barangay ID", "Sector Barangay Name", "Municipality", "Province", "Total Surveys Recorded", "Total Payout PHP"];
      const fileRows = barangayReportsData.map(b => [b.id, `"${b.name}"`, `"${b.city}"`, `"${b.province}"`, b.totalSurveys, b.totalAmount].join(','));
      csvContent = [fileHeaders.join(','), ...fileRows].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Audit Reporting Studio</h1>
          <p className="text-slate-400 text-xs mt-1">
            Generate and export payroll data, historic settlements breakdown, group productivity index, and barangay sectors.
          </p>
        </div>

        {/* Unified Download Trigger */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-2xl shadow-md border border-indigo-505 self-start md:self-auto transition duration-150"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" />
          Download CSV Report Table
        </button>
      </div>

      {/* Reports navigation bar row tabs */}
      <div className="flex border-b border-slate-100 pb-px gap-1 overflow-x-auto">
        <button
          onClick={() => setSelectedReportType('payroll')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-3 border-b-2 transition duration-200 whitespace-nowrap ${
            selectedReportType === 'payroll'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          Payroll Report
        </button>
        <button
          onClick={() => setSelectedReportType('settlement')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-3 border-b-2 transition duration-200 whitespace-nowrap ${
            selectedReportType === 'settlement'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Settlement Report
        </button>
        <button
          onClick={() => setSelectedReportType('group')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-3 border-b-2 transition duration-200 whitespace-nowrap ${
            selectedReportType === 'group'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Group Productivity Report
        </button>
        <button
          onClick={() => setSelectedReportType('barangay')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-3 border-b-2 transition duration-200 whitespace-nowrap ${
            selectedReportType === 'barangay'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="h-4 w-4" />
          Barangay Sector Summary
        </button>
      </div>

      {/* Report layout canvas */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
        
        {/* REPORT TYPE 1: EXPANDED ACTIVE PAYROLL DETAIL */}
        {selectedReportType === 'payroll' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-55 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Active Survey Payroll Report</h2>
                <p className="text-slate-400 text-xs mt-0.5">Summary of pending, unsettled field survey payouts.</p>
              </div>
              <div className="text-right text-xs">
                <span className="block text-slate-400 font-semibold uppercase tracking-wider">Active Outflow</span>
                <span className="text-lg font-black font-mono text-indigo-950">{totalActivePayout.toLocaleString()} PHP</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-450 font-extrabold uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Date Logged</th>
                    <th className="px-4 py-2.5 text-left">Survey ID</th>
                    <th className="px-4 py-2.5 text-left">Zone Barangay</th>
                    <th className="px-4 py-2.5 text-left">Group Mapped</th>
                    <th className="px-4 py-2.5 text-right">Population count</th>
                    <th className="px-4 py-2.5 text-right">Base rate</th>
                    <th className="px-4 py-2.5 text-right">Payout Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {surveys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-404 bg-slate-50/20">
                        Zero active uncommitted surveys currently in db.
                      </td>
                    </tr>
                  ) : (
                    surveys.map(s => {
                      const tName = groups.find(g => g.id === s.groupId)?.groupName || 'Ghost Group';
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono text-slate-400">{s.date}</td>
                          <td className="px-4 py-2 text-indigo-650 font-bold font-mono">{s.id}</td>
                          <td className="px-4 py-2 font-black text-indigo-950">{s.barangay}</td>
                          <td className="px-4 py-2 text-slate-900">{tName}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500">{s.populationCount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-550">{s.rate} PHP</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-900">{s.totalPayout.toLocaleString()} PHP</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT TYPE 2: HISTORICAL SETTLEMENT RANGE */}
        {selectedReportType === 'settlement' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-55 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Accounts Historical Settlements Report</h2>
                <p className="text-slate-400 text-xs mt-0.5">Aggregated audit log payments completed and verified by Administrator.</p>
              </div>
              <div className="text-right text-xs">
                <span className="block text-slate-400 font-semibold uppercase tracking-wider">Total Settled Archive</span>
                <span className="text-lg font-black font-mono text-emerald-700">{totalPaidPayout.toLocaleString()} PHP</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-450 font-extrabold uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Approval Date</th>
                    <th className="px-4 py-2.5 text-left">Settle ID</th>
                    <th className="px-4 py-2.5 text-left">From Range</th>
                    <th className="px-4 py-2.5 text-left">To Range</th>
                    <th className="px-4 py-2.5 text-left">Audit Remarks</th>
                    <th className="px-4 py-2.5 text-right">Settled amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-404 bg-slate-50/20">
                        Zero historic accounts settlements stored.
                      </td>
                    </tr>
                  ) : (
                    settlements.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-mono font-bold text-slate-500">{s.settlementDate}</td>
                        <td className="px-4 py-2 text-emerald-650 font-black font-mono">{s.id}</td>
                        <td className="px-4 py-2 font-mono text-slate-404">{s.fromDate}</td>
                        <td className="px-4 py-2 font-mono text-slate-404">{s.toDate}</td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs">{s.remarks}</td>
                        <td className="px-4 py-2 text-right font-mono font-black text-emerald-800">{s.totalAmount.toLocaleString()} PHP</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT TYPE 3: TEAM PRODUCTIVITY MATRIX */}
        {selectedReportType === 'group' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-55 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Workgroups Productivity & Earnings Matrix</h2>
                <p className="text-slate-400 text-xs mt-0.5">Cumulative calculations tracking surveys mapped and grand gross compensation.</p>
              </div>
              <div className="text-right text-xs">
                <span className="block text-slate-400 font-semibold uppercase tracking-wider">Gross Payroll Combined</span>
                <span className="text-lg font-black font-mono text-indigo-950">{totalCombinedGross.toLocaleString()} PHP</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-450 font-extrabold uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Group ID</th>
                    <th className="px-4 py-2.5 text-left">Group Name</th>
                    <th className="px-4 py-2.5 text-left">Base Rate</th>
                    <th className="px-4 py-2.5 text-left">Team Status</th>
                    <th className="px-4 py-2.5 text-center">Active Block (Sum)</th>
                    <th className="px-4 py-2.5 text-center">Settled Archive (Sum)</th>
                    <th className="px-4 py-2.5 text-right">Interviews Volume</th>
                    <th className="px-4 py-2.5 text-right">Gross Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {groupReportsData.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-indigo-600 font-bold font-mono">{g.id}</td>
                      <td className="px-4 py-2.5 text-slate-900 font-black">{g.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{g.rate} PHP</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          g.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-indigo-500">{g.activeSurveysCount} ({g.activePayout.toLocaleString()} PHP)</td>
                      <td className="px-4 py-2.5 text-center text-emerald-600">{g.paidSurveysCount} ({g.paidPayout.toLocaleString()} PHP)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">{g.totalPopCount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black text-indigo-950">{g.totalPayoutGross.toLocaleString()} PHP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT TYPE 4: REGIONAL BARANGAY METRIC LIST */}
        {selectedReportType === 'barangay' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-55 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Regional Barangay Sector Coverage Summary</h2>
                <p className="text-slate-400 text-xs mt-0.5">Regional audit mapping and total investments across administrative sectors.</p>
              </div>
              <div className="text-right text-xs">
                <span className="block text-slate-400 font-semibold uppercase tracking-wider">Total Sectors Mapped</span>
                <span className="text-lg font-black font-mono text-slate-900">{barangays.length} Areas</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-450 font-extrabold uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Barangay ID</th>
                    <th className="px-4 py-2.5 text-left">Sector Barangay Name</th>
                    <th className="px-4 py-2.5 text-left">Municipality / City</th>
                    <th className="px-4 py-2.5 text-left">Province</th>
                    <th className="px-4 py-2.5 text-center">Unpaid survey block</th>
                    <th className="px-4 py-2.5 text-center">Settle payment block</th>
                    <th className="px-4 py-2.5 text-right">Aggregate surveys count</th>
                    <th className="px-4 py-2.5 text-right">Sum investment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {barangayReportsData.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-indigo-600 font-bold font-mono">{b.id}</td>
                      <td className="px-4 py-2.5 text-slate-900 font-black">{b.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{b.city}</td>
                      <td className="px-4 py-2.5 text-slate-550">{b.province}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-indigo-500">{b.activeSurveys} ({b.activeAmount.toLocaleString()} PHP)</td>
                      <td className="px-4 py-2.5 text-center font-mono text-emerald-650">{b.paidSurveys} ({b.paidAmount.toLocaleString()} PHP)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{b.totalSurveys}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black text-indigo-950">{b.totalAmount.toLocaleString()} PHP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
