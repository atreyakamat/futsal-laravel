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
  payment_status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  payment_method: 'online' | 'cash' | 'upi';
  checked_in: number | boolean;
  is_free_booking: number | boolean;
  payu_mihpayid: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SlotLockRow {
  id: number;
  arena_id: number;
  booking_date: string;
  time_slot: string;
  session_id: string;
  locked_at: string;
  expires_at: string;
}