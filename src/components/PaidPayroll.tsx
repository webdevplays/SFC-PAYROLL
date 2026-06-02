/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Calendar, Download, Printer, Archive, Layers, Receipt } from 'lucide-react';

export const PaidPayroll: React.FC = () => {
  const { paidPayroll, settlements } = useApp();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Statistics
  const totalSettledCount = settlements.length;
  const totalPaidAmount = paidPayroll.reduce((sum, item) => sum + item.totalPayout, 0);

  // Filter settled logs
  const filteredPaidRows = paidPayroll.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch =
      row.settlementId.toLowerCase().includes(q) ||
      row.groupName.toLowerCase().includes(q) ||
      row.barangay.toLowerCase().includes(q) ||
      row.surveyId.toLowerCase().includes(q);

    const matchFromDate = fromDate ? row.paidDate >= fromDate : true;
    const matchToDate = toDate ? row.paidDate <= toDate : true;

    return matchSearch && matchFromDate && matchToDate;
  });

  // EXPORT UTILITIES (Real CSV blob generation with download triggers)
  const triggerExportCSV = () => {
    if (filteredPaidRows.length === 0) return;
    
    // Header
    const csvHeaders = ["Settlement ID", "Survey ID", "Group Name", "Barangay", "Population Count", "Rate", "Total Payout PHP", "Paid Date"];
    
    // Rows
    const csvRows = filteredPaidRows.map((row) => {
      const sanitizedGroupName = `"${row.groupName.replace(/"/g, '""')}"`;
      const sanitizedBarangay = `"${row.barangay.replace(/"/g, '""')}"`;
      return [
        row.settlementId,
        row.surveyId,
        sanitizedGroupName,
        sanitizedBarangay,
        row.populationCount,
        row.rate,
        row.totalPayout,
        row.paidDate
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Field_Survey_Paid_Payroll_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerExportExcelHTML = () => {
    if (filteredPaidRows.length === 0) return;
    
    // Create Excel compatible XML Spreadsheet or simple HTML Table layout
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #f1f5f9; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 8px; }
          .money { text-align: right; mso-number-format:"\\#,\\#\\#0\\.00"; }
        </style>
      </head>
      <body>
        <h2>Field Survey Paid Payroll Ledger</h2>
        <p>Generated Date: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Settlement ID</th>
              <th>Survey ID</th>
              <th>Group Name</th>
              <th>Barangay</th>
              <th>Population Count</th>
              <th>Rate (PHP)</th>
              <th>Total Payout (PHP)</th>
              <th>Paid Date</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredPaidRows.forEach(row => {
      html += `
        <tr>
          <td>${row.settlementId}</td>
          <td>${row.surveyId}</td>
          <td>${row.groupName}</td>
          <td>${row.barangay}</td>
          <td align="right">${row.populationCount}</td>
          <td align="right" class="money">${row.rate}</td>
          <td align="right" class="money">${row.totalPayout}</td>
          <td>${row.paidDate}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Field_Survey_Paid_Payroll_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans print:bg-white print:p-0">
      {/* Upper header - hide on Print */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Accounts Archive Ledger</h1>
          <p className="text-slate-400 text-xs mt-1">
            Display settled survey transactions, export receipts spreadsheet, or print hardcopies.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={triggerExportCSV}
            disabled={filteredPaidRows.length === 0}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-xl shadow-xs transition disabled:opacity-45"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={triggerExportExcelHTML}
            disabled={filteredPaidRows.length === 0}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-xl shadow-xs transition disabled:opacity-45"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredPaidRows.length === 0}
            className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 border border-indigo-100 rounded-xl shadow-xs transition disabled:opacity-45"
          >
            <Printer className="h-4 w-4" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* Printable Title Block - Visible only when printing */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Field Survey Payroll System</h1>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">Paid Settlement Archive Ledger</h2>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-4 leading-relaxed font-mono">
          <span>Date Run: {new Date().toLocaleString()}</span>
          <span>Settle Records Displayed: {filteredPaidRows.length}</span>
        </div>
      </div>

      {/* Stats row - hide on print */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-150 flex items-center justify-center text-teal-650">
            <Archive className="h-6 w-6" id="archive-logo" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Settled Amount</span>
            <span className="text-xl font-black text-slate-950">{totalPaidAmount.toLocaleString()} <span className="text-xs text-slate-450 font-bold">PHP</span></span>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-150 flex items-center justify-center text-violet-650">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Number of Settlements</span>
            <span className="text-xl font-black text-slate-950">{totalSettledCount} <span className="text-xs text-slate-450 font-bold">settlements</span></span>
          </div>
        </div>
      </div>

      {/* Database spreadsheet block */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6 print:p-0 print:border-0 print:shadow-none">
        
        {/* Filters bar - hide on print */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 pb-2 border-b border-slate-50 print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-950">Settlement Ledger rows</h2>
            <p className="text-slate-400 text-xs mt-0.5">Double-entry record of finalized and disbursed survey payments.</p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center max-w-3xl w-full xl:justify-end">
            <div className="flex items-center gap-2 border border-slate-200 p-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent focus:outline-none font-medium text-slate-800"
                placeholder="From"
                title="Settle From Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent focus:outline-none font-medium text-slate-800"
                placeholder="To"
                title="Settle To Date"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="px-1 text-[10px] text-rose-500 hover:bg-rose-50 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative rounded-xl shadow-xs max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Settlement ID, Team..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-950 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 print:rounded-none print:border-collapse">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-450 font-bold uppercase tracking-wider print:bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Settlement ID</th>
                <th className="px-4 py-3 text-left">Survey ID</th>
                <th className="px-4 py-3 text-left">Group Name</th>
                <th className="px-4 py-3 text-left">Settled Barangay Zone</th>
                <th className="px-4 py-3 text-right">Population Count</th>
                <th className="px-4 py-3 text-right">Rate applied</th>
                <th className="px-4 py-3 text-right">Settled payout</th>
                <th className="px-4 py-3 text-left">Approval Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap">
              {filteredPaidRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold bg-slate-50/20">
                    No matching settled payroll logs found.
                  </td>
                </tr>
              ) : (
                filteredPaidRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 print:bg-white">
                    <td className="px-4 py-3 text-emerald-600 font-black font-mono">{row.settlementId}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{row.surveyId}</td>
                    <td className="px-4 py-3 text-slate-950 font-black">{row.groupName}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-950">{row.barangay}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-650">{row.populationCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{row.rate} PHP</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-indigo-950">{row.totalPayout.toLocaleString()} PHP</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{row.paidDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregation Summary Footer */}
        {filteredPaidRows.length > 0 && (
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs print:mt-6 print:bg-transparent print:border">
            <span className="font-bold text-slate-500">Aggregate value of displayed ledger rows:</span>
            <span className="font-mono font-black text-indigo-950 text-sm">
              {filteredPaidRows.reduce((sum, s) => sum + s.totalPayout, 0).toLocaleString()} PHP (across {filteredPaidRows.length} audit lines)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
