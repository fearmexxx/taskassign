export interface EventCue {
  id: number;
  project_id: number;
  cue_order: number;
  cue_code: string;
  start_time: string;
  duration_mins: number;
  segment_title: string;
  mc_script: string;
  audio_cue: string;
  lighting_cue: string;
  visual_cue: string;
  stage_notes: string;
  pic_id: number | null;
  pic_name: string;
  status: 'pending' | 'standby' | 'live' | 'done';
  live_started_at: string | null;
  updated_at?: string;
}

export type LogisticsStatus = 'planned' | 'checked_out' | 'onsite' | 'returned' | 'issue';

export interface EventLogisticsItem {
  id: number;
  project_id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  pic_id: number | null;
  pic_name: string;
  status: LogisticsStatus;
  notes: string;
  updated_at?: string;
}

export interface EventBudgetItem {
  id: number;
  project_id: number;
  category: string;
  item_name: string;
  vendor_name: string;
  vendor_phone: string;
  unit: string;
  quantity: number;
  estimated_unit_price: number;
  actual_unit_price: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'deposit' | 'paid';
  payment_due_date: string | null;
  notes: string;
  estimated_total: number;
  actual_total: number;
  remaining: number;
}

export interface EventBudgetSummary {
  revenue: number;
  collected_from_client: number;
  estimated_cost: number;
  actual_cost: number;
  paid_to_vendors: number;
  vendor_debt: number;
  commission: number;
  commission_rate: number;
  gross_profit: number;
  gross_margin: number;
  deal: {
    id: number;
    title: string;
    customer_name: string;
    payment_status: string;
  } | null;
}

export interface HrLeaveRequest {
  id: number;
  user_id: number;
  user_name: string;
  department_id: number | null;
  department_name?: string;
  project_id: number | null;
  project_name?: string;
  request_type: 'leave' | 'comp_off' | 'overtime' | 'show_allowance';
  start_date: string;
  end_date: string;
  hours_or_days: number;
  allowance_amount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by: number | null;
  approver_name?: string;
  approved_at: string | null;
  created_at: string;
}

export interface HrFreelancer {
  id: number;
  name: string;
  phone: string;
  role_specialty: string;
  daily_rate: number;
  portfolio_link: string;
  bank_info: string;
  rating: number;
  notes: string;
  created_at: string;
}

export type CommsChannel = 'ALL' | 'STAGE' | 'TECH' | 'FOH' | 'LOGISTICS';

export interface VoiceCommsMessage {
  id: number;
  project_id: number | null;
  channel: CommsChannel;
  user_id: number;
  user_name: string;
  user_role: string;
  message_type: 'voice' | 'sos' | 'cue_call';
  text_message: string;
  audio_data: string | null;
  duration_sec: number;
  created_at: string;
}
