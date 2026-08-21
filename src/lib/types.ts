import type { Department, RequestStatus, RequestType } from './constants';

export type EmployeeRow = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  department: Department;
  role: 'employee' | 'admin';
  status: 'pending' | 'active' | 'rejected' | 'disabled';
  reject_reason: string | null;
  created_at: string;
  approved_at: string | null;
  last_login_at: string | null;
};

export type RequestRow = {
  id: string;
  request_number: string;
  type: RequestType;
  civil_number: string;
  full_name: string;
  phone: string;
  site_location_url: string | null;
  citizen_notes: string | null;
  status: RequestStatus;

  technical_decision: 'approved' | 'rejected' | null;
  technical_notes: string | null;
  technical_by_name: string | null;
  technical_by_number: string | null;
  technical_at: string | null;

  health_decision: 'approved' | 'rejected' | null;
  health_notes: string | null;
  health_by_name: string | null;
  health_by_number: string | null;
  health_at: string | null;

  payment_status: 'unpaid' | 'paid' | 'exempt';
  payment_amount: number | null;
  payment_reference: string | null;
  finance_notes: string | null;
  finance_by_name: string | null;
  finance_by_number: string | null;
  finance_at: string | null;

  investment_notes: string | null;
  investment_by_name: string | null;
  investment_by_number: string | null;
  investment_at: string | null;

  rejected_by_department: Department | null;
  rejected_by_name: string | null;
  rejected_by_number: string | null;
  rejection_notes: string | null;
  rejected_at: string | null;

  created_at: string;
  updated_at: string;
};

export type AttachmentRow = {
  id: string;
  request_id: string;
  field_key: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  request_id: string;
  department: Department | 'citizen';
  action: string;
  notes: string | null;
  employee_name: string | null;
  employee_number: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  employee_id: string;
  request_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;
