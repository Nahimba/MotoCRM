// src/types/database.ts

export interface Account {
  id: string;
  full_name: string;
  phone?: string;
  total_balance: number; 
  account_status: 'active' | 'debtor' | 'inactive';
  created_at?: string;
}

export interface Enrollment {
  id: string;
  account_id: string;
  service_id: string;
  contract_price: number;
  total_hours: number;
  remaining_hours: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface AttendanceLog {
  id?: string;
  enrollment_id: string;
  instructor_id: string;
  hours_spent: number;
  session_date: string;
}

export interface LedgerEntry {
  id?: string;
  account_id?: string; 
  amount: number;
  entry_type: 'payment' | 'salary_expense' | 'overhead' | 'discount';
  description: string;
  created_at?: string;
}