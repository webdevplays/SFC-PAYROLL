/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Receipt, ClipboardCheck, ArrowRightLeft, FileWarning, Eye, Check } from 'lucide-react';

export const Settlement: React.FC = () => {
  const { surveys, groups, addSettlement, user } = useApp();

  // Wizard state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Previewing settlement
  const [previewActive, setPreviewActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filter uncommitted surveys based on dates to display preview
  const matchedSurveys = surveys.filter((s) => {
    if (!fromDate || !toDate) return false;
    return s.date >= fromDate && s.date <= toDate;
  });

  const totalCalculatedPayout = matchedSurveys.reduce((sum, s) => sum + s.totalPayout, 0);

  const handleGeneratePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    setPreviewActive(true);
  };

  const handleTriggerSettlement = async () => {
    const success = await addSettlement(fromDate, toDate, remarks);
    if (success) {
      // Clear wizard
      setFromDate('');
      setToDate('');
      setRemarks('');
      setPreviewActive(false);
    }
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">Accounts Settlement</h1>
        <p className="text-slate-400 text-xs mt-1">
          Perform uncommitted payroll closure audits, generate settlement lists, and sync with Google Sheets Paid Payroll.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Setup parameters Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm self-start">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
            Prepare New Settlement Period
          </h2>

          <form onSubmit={handleGeneratePreview} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Billing Coverage: From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPreviewActive(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Billing Coverage: To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPreviewActive(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Settlement Audit Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. June 2026 first-half disbursements audits..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 flex items-center gap-2"
            >
              <Eye className="h-4.5 w-4.5" />
              Scan date coverage and preview list
            </button>
          </form>
        </div>

        {/* Right Side: Preview items before commitments */}
        <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
          {!previewActive ? (
            <div className="h-80 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-250 rounded-2xl bg-slate-50/20">
              <Receipt className="h-12 w-12 text-slate-350 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Audit Preview Panel</h3>
              <p className="text-slate-405 text-xs max-w-sm mt-1">
                Establish billing date boundaries in parameters card on left to see matched active field surveys ready for clearance.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Disbursement Settlement Audit</h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Pre-settlement list matching date boundaries [{fromDate}] to [{toDate}]
                  </p>
                </div>
                <div className="bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-100 text-right">
                  <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Uncommitted Aggregate</span>
                  <span className="text-lg font-black text-indigo-900 font-mono">
                    {totalCalculatedPayout.toLocaleString()} PHP
                  </span>
                </div>
              </div>

              {matchedSurveys.length === 0 ? (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex gap-3">
                  <FileWarning className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="font-bold">No Records Matched</h4>
                    <p className="mt-1">
                      There are no active / unpaid survey logs recorded between {fromDate} and {toDate}. Specify a different coverage to continue.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-60 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 text-slate-450 font-bold uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Date</th>
                          <th className="px-4 py-2.5 text-left">Survey ID</th>
                          <th className="px-4 py-2.5 text-left">Workgroup</th>
                          <th className="px-4 py-2.5 text-left">Sector Area</th>
                          <th className="px-4 py-2.5 text-right">Pop. Mapped</th>
                          <th className="px-4 py-2.5 text-right">Unit Net</th>
                          <th className="px-4 py-2.5 text-right">Payout Gross</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {matchedSurveys.map((srv) => {
                          const grpName = groups.find((g) => g.id === srv.groupId)?.groupName || 'Unknown Group';
                          return (
                            <tr key={srv.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-mono text-slate-500">{srv.date}</td>
                              <td className="px-4 py-2 text-indigo-600 font-bold font-mono">{srv.id}</td>
                              <td className="px-4 py-2 text-slate-900 font-bold">{grpName}</td>
                              <td className="px-4 py-2 text-slate-700">{srv.barangay}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-500">{srv.populationCount.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-500">{srv.rate} PHP</td>
                              <td className="px-4 py-2 text-right font-mono font-black text-indigo-900">{srv.totalPayout.toLocaleString()} PHP</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50/45 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950 font-semibold leading-relaxed">
                    <ClipboardCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-indigo-900">System Settle Action Consequences</h4>
                      <p className="mt-1 font-medium text-indigo-850">
                        Executing this transaction will permanently commit {matchedSurveys.length} survey records as settled, move item metadata to paid records archive, and release active survey lines.
                      </p>
                    </div>
                  </div>

                  {user?.role === 'Admin' ? (
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="flex py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition items-center gap-2"
                    >
                      <ArrowRightLeft className="h-4.5 w-4.5" />
                      Add Settlement & Archive Payroll
                    </button>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <FileWarning className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>Security restriction: Role {user?.role} does not possess parameters clearance. Settle permissions are locked to Admin operators.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL WINDOW */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-950">Approve payroll closure?</h3>
              <p className="text-slate-500 text-xs mt-2 font-medium">
                Are you sure you want to settle this payroll? This transitions {matchedSurveys.length} records totaling <span className="font-bold text-indigo-600">{totalCalculatedPayout.toLocaleString()} PHP</span> to paid ledger columns permanently.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleTriggerSettlement}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl text-sm transition-colors duration-150 shadow-sm"
              >
                Yes, settle now
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl text-sm transition-colors duration-150"
              >
                No, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
