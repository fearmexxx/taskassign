export interface CrmCustomer {
  id: number;
  phone: string; // Unique key
  name: string;
  company: string;
  email: string;
  social: string;
  address: string;
  commission_rate: number;
  commission_notes: string;
  current_project_status: string;
  past_projects_notes: string;
  forecast_quarter: string;
  forecast_year: number;
  forecast_revenue: number;
  forecast_notes: string;
  assigned_to: number | null;
  assigned_name?: string;
  created_by: number | null;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  total_deals?: number;
  total_won_value?: number;
}

export type DealStage = 
  | 'lead' 
  | 'brief' 
  | 'proposal' 
  | 'meeting' 
  | 'negotiation' 
  | 'won' 
  | 'execution' 
  | 'payment_report' 
  | 'lost';

export interface CrmDeal {
  id: number;
  customer_id: number;
  customer_phone: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_social?: string;
  customer_address?: string;
  commission_rate?: number;
  commission_notes?: string;
  current_project_status?: string;
  past_projects_notes?: string;
  title: string;
  stage: DealStage;
  expected_value: number;
  contract_value: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  project_id: number | null;
  project_name?: string;
  project_status?: string;
  brief_content: string;
  proposal_url: string;
  contract_number: string;
  contract_url: string;
  meeting_notes: string;
  feedback_notes: string;
  event_report_notes: string;
  expected_close_date: string;
  assigned_to: number | null;
  assigned_name?: string;
  created_by: number | null;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  activities?: CrmActivity[];
}

export interface CrmActivity {
  id: number;
  deal_id: number;
  customer_phone: string;
  user_id: number | null;
  user_name?: string;
  action_type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'payment';
  content: string;
  created_at: string;
}

export interface CrmStats {
  total_customers: number;
  total_deals: number;
  pipeline_value: number;
  won_value: number;
  total_collected: number;
  stage_counts: Record<DealStage, number>;
  forecast_by_quarter: {
    forecast_year: number;
    forecast_quarter: string;
    total_forecast: number;
    customer_count: number;
  }[];
}

// Helper phân quyền CRM
export const canAccessCrm = (user: { role?: string; email?: string; department_name?: string } | null): boolean => {
  if (!user) return false;
  if (user.role === 'Admin' || user.email === 'vinh@vbe.vn') return true;
  const dept = user.department_name || '';
  return dept.includes('Sales') || dept.includes('Account');
};
