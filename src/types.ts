/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  fullName: string;
  position: string;
  address: string;
  createdDate: string;
}

export interface Barangay {
  id: string;
  barangayName: string;
  municipality: string;
  province: string;
  createdDate: string;
}

export interface Group {
  id: string;
  groupName: string;
  leaderId: string;
  coLeaderId: string;
  coLeaderIds?: string[];
  rate: number;
  barangayAssigned: string;
  addressDesignated: string;
  status: 'Active' | 'Inactive';
}

export interface Survey {
  id: string;
  date: string;
  barangay: string;
  groupId: string;
  populationCount: number;
  rate: number;
  totalPayout: number;
  createdBy: string;
  createdDate: string;
}

export interface Settlement {
  id: string;
  settlementDate: string;
  fromDate: string;
  toDate: string;
  totalAmount: number;
  remarks: string;
}

export interface PaidPayroll {
  id: string;
  settlementId: string;
  surveyId: string;
  groupName: string;
  barangay: string;
  populationCount: number;
  rate: number;
  totalPayout: number;
  paidDate: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface User {
  username: string;
  role: 'Admin' | 'Payroll Staff';
  fullName: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  clientId: string;
  clientEmail: string;
  privateKey: string;
  isSyncEnabled: boolean;
}

export interface UserCredentials {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'Admin' | 'Payroll Staff';
  createdDate: string;
}
