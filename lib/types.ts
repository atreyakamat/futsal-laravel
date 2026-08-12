export interface ArenaSummary {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  cover_image: string | null;
  status: string;
  min_price: number;
  bot_enabled?: number | boolean | null;
  gmaps_link?: string | null;
}

export interface PricingRow {
  id: number;
  arena_id: number;
  time_slot: string;
  price: number;
  day_of_week: number | null;
}

export interface BookingRow {
  id: number;
  ticket_number: string;
  booking_ref: string;
  arena_id: number;
  user_id: number | null;
  booking_date: string;
  time_slot: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  amount: number;
  payment_status: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'expired' | 'refunded';
  payment_method: 'online' | 'cash' | 'upi';
  checked_in: number | boolean;
  checked_in_at?: Date | string | null;
  checked_in_by?: number | null;
  is_free_booking: number | boolean;
  payu_mihpayid: string | null;
  cancellation_requested?: boolean;
  cancellation_reason?: string | null;
  refund_amount?: number | null;
  refund_status?: 'NONE' | 'PENDING_REVIEW' | 'APPROVED' | 'PROCESSING' | 'REFUNDED' | 'REJECTED' | string | null;
  refund_reviewed_at?: Date | string | null;
  refund_reviewed_by?: number | null;
  refund_reason?: string | null;
  refund_processed_at?: Date | string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookingSlotItem {
  id: number;
  ticket_number: string;
  booking_date: string;
  time_slot: string;
  amount: number;
  checked_in: boolean;
  checked_in_at?: string | null;
}

export interface BookingGroup {
  booking_ref: string;
  primary_ticket_number: string;
  arena_id: number;
  user_id: number | null;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  booking_date: string;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  payu_mihpayid: string | null;
  is_free_booking: boolean;
  cancellation_requested: boolean;
  cancellation_reason: string | null;
  refund_amount: number | null;
  refund_status: string;
  refund_reviewed_at: Date | string | null;
  refund_reviewed_by: number | null;
  refund_reason: string | null;
  refund_processed_at: Date | string | null;
  created_at: Date;
  updated_at: Date;
  slots: BookingSlotItem[];
}

export interface SlotLockRow {
  id: number;
  arena_id: number;
  booking_date: string;
  time_slot: string;
  session_id: string;
  locked_at: Date;
  expires_at: Date;
}