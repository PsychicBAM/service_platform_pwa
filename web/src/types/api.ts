export type OperatingMode = "booking_only" | "orders_only" | "both";
export type ServiceType = "booking" | "order";
export type PriceType = "fixed" | "free" | "quote";
export type UserRole = "client" | "business_admin" | "superadmin";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  operating_mode: OperatingMode;
  contact_phone: string | null;
  address: string | null;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  type: ServiceType;
  duration_minutes: number | null;
  price_cents: number | null;
  currency: string;
  price_type: PriceType;
  require_payment: boolean;
  sort_order: number;
}

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
}

export interface AvailabilityResponse {
  date: string;
  service_id: string;
  slots: AvailabilitySlot[];
}

export interface PublicBookingClientInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PublicBookingCreate {
  service_id: string;
  starts_at: string;
  client_notes?: string | null;
  client: PublicBookingClientInput;
}

export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface PublicBookingCreateResponse {
  id: string;
  reference: string;
  status: BookingStatus;
  service: {
    id: string;
    name: string;
    type: ServiceType;
  };
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  starts_at: string;
  ends_at: string;
  payment_required: boolean;
  payment: null;
}

export interface PublicOrderCreate {
  service_id: string;
  form_data?: Record<string, unknown>;
  client: PublicBookingClientInput;
}

export type OrderStatus =
  | "submitted"
  | "pending_payment"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled";

export interface PublicOrderCreateResponse {
  id: string;
  reference: string;
  status: OrderStatus;
  service: {
    id: string;
    name: string;
    type: ServiceType;
  };
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  form_data: Record<string, unknown>;
  created_at: string;
  payment_required: boolean;
  payment: null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserRead {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserRead;
  tokens: TokenPair;
}

export interface BusinessRegisterInput {
  name: string;
  slug: string;
  operating_mode?: OperatingMode;
  timezone?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  business: BusinessRegisterInput;
}

export interface RegisterResponse {
  user: UserRead;
  business: { id: string; name: string; slug: string };
  tokens: TokenPair;
}

export interface MeBusinessItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface MeResponse {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  businesses: MeBusinessItem[];
}

export type MyBookingStatusFilter = "upcoming" | "past" | "cancelled";
export type MyOrderStatusFilter = "active" | "completed" | "declined" | "cancelled";

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface MyBookingBusinessSummary {
  id: string;
  name: string;
  slug: string;
}

export interface MyBookingServiceSummary {
  id: string;
  name: string;
}

export interface MyBookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  business: MyBookingBusinessSummary;
  service: MyBookingServiceSummary;
  starts_at: string;
  ends_at: string;
  can_cancel: boolean;
  can_reschedule: boolean;
}

export interface MyBookingDetail {
  id: string;
  reference: string;
  status: BookingStatus;
  business: MyBookingBusinessSummary;
  service: MyBookingServiceSummary;
  starts_at: string;
  ends_at: string;
  client_notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  can_cancel: boolean;
  can_reschedule: boolean;
  created_at: string;
  updated_at: string;
}

export interface MyBookingListResponse {
  data: MyBookingListItem[];
  meta: ListMeta;
}

export interface MyOrderBusinessSummary {
  id: string;
  name: string;
  slug: string;
}

export interface MyOrderServiceSummary {
  id: string;
  name: string;
  type: ServiceType;
  price_cents: number | null;
  price_type: PriceType;
  currency: string;
}

export interface MyOrderListItem {
  id: string;
  reference: string;
  status: OrderStatus;
  business: MyOrderBusinessSummary;
  service: MyOrderServiceSummary;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
  can_cancel: boolean;
}

export interface MyOrderDetail {
  id: string;
  reference: string;
  status: OrderStatus;
  business: MyOrderBusinessSummary;
  service: MyOrderServiceSummary;
  form_data: Record<string, unknown>;
  quoted_price_cents: number | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  can_cancel: boolean;
}

export interface MyOrderListResponse {
  data: MyOrderListItem[];
  meta: ListMeta;
}

export type OrderMessageSenderType = "client" | "admin";

export interface OrderMessageRead {
  id: string;
  order_id: string;
  business_id: string;
  sender_type: OrderMessageSenderType;
  sender_user_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface OrderMessageListResponse {
  data: OrderMessageRead[];
  meta: ListMeta;
}
