import type { MiniSiteConfig } from "@/types/miniSite";

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

export type PublicPageVariant = "standard" | "mini_site";

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  operating_mode: OperatingMode;
  contact_phone: string | null;
  address: string | null;
  average_rating?: number | null;
  review_count?: number;
  public_page_variant: PublicPageVariant;
  miniSiteConfig: MiniSiteConfig | null;
}

export type ReviewStatus = "published" | "hidden";

export interface ReviewRead {
  id: string;
  business_id: string;
  service_id: string | null;
  service_name?: string | null;
  booking_id: string | null;
  booking_reference?: string | null;
  order_id: string | null;
  order_reference?: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicReviewCreate {
  booking_reference?: string | null;
  order_reference?: string | null;
  email?: string | null;
  phone?: string | null;
  rating: number;
  comment?: string | null;
  customer_name?: string | null;
}

export interface PublicReviewItem {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  service_name?: string | null;
  created_at: string;
}

export interface PublicReviewSummary {
  average_rating: number | null;
  review_count: number;
}

export interface PublicReviewsResponse {
  summary: PublicReviewSummary;
  reviews: PublicReviewItem[];
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
  image?: import("@/lib/serviceImage").ServiceImageMedia | null;
}

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  spots_remaining?: number | null;
  is_fully_booked?: boolean;
  waitlist_available?: boolean;
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
  legal_consent_accepted: boolean;
}

export type WaitlistStatus = "waiting" | "contacted" | "cancelled" | "resolved";

export interface PublicWaitlistCreate {
  service_id: string;
  starts_at: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  note?: string | null;
}

export interface PublicWaitlistCreateResponse {
  id: string;
  service_id: string;
  starts_at: string;
  status: WaitlistStatus;
  message: string;
}

export interface WaitlistEntryRead {
  id: string;
  business_id: string;
  service_id: string;
  service_name: string;
  starts_at: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  note: string | null;
  status: WaitlistStatus;
  created_at: string;
  updated_at: string;
}

export interface WaitlistListResponse {
  data: WaitlistEntryRead[];
}

export interface WaitlistPromoteResponse {
  booking: AdminBookingRead;
  waitlist_entry: WaitlistEntryRead;
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
  legal_consent_accepted: boolean;
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

export interface RefreshResponse {
  access_token: string;
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
  selected_plan_intent?: SubscriptionPlan;
  legal_consent_accepted: boolean;
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
  email_verified?: boolean;
  businesses: MeBusinessItem[];
}

export interface EmailVerifyRequest {
  token: string;
}

export interface EmailVerifyResponse {
  verified: boolean;
  email: string;
}

export interface EmailVerificationResendResponse {
  sent: boolean;
  already_verified: boolean;
  message?: string | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  sent: boolean;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface PasswordResetConfirmResponse {
  reset: boolean;
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
  has_review: boolean;
  can_review: boolean;
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
  has_review: boolean;
  can_review: boolean;
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
  has_review: boolean;
  can_review: boolean;
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
  has_review: boolean;
  can_review: boolean;
}

export interface MyOrderListResponse {
  data: MyOrderListItem[];
  meta: ListMeta;
}

export interface ClaimGuestBookingPayload {
  reference: string;
  email?: string;
  phone?: string;
}

export interface ClaimGuestOrderPayload {
  reference: string;
  email?: string;
  phone?: string;
}

export interface ClaimGuestBookingResponse {
  booking: MyBookingDetail;
}

export interface ClaimGuestOrderResponse {
  order: MyOrderDetail;
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

export type BusinessStatus = "draft" | "active" | "suspended";
export type ClientSource = "registered" | "guest" | "admin_created";

export interface BusinessSettingsRead {
  auto_confirm_bookings: boolean;
  cancellation_hours: number;
  max_advance_booking_days: number;
  min_advance_booking_hours: number;
  allow_guest_checkout: boolean;
  slot_interval_minutes: number;
  booking_buffer_minutes: number;
  require_payment_default: boolean;
  notification_email_enabled: boolean;
  selected_plan_intent?: SubscriptionPlan | null;
}

export interface BusinessSettingsUpdatePayload {
  auto_confirm_bookings?: boolean;
  cancellation_hours?: number;
  max_advance_booking_days?: number;
  min_advance_booking_hours?: number;
  allow_guest_checkout?: boolean;
  slot_interval_minutes?: number;
  booking_buffer_minutes?: number;
  require_payment_default?: boolean;
  notification_email_enabled?: boolean;
}

export interface BusinessUpdatePayload {
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  timezone?: string;
  operating_mode?: OperatingMode;
  settings?: BusinessSettingsUpdatePayload;
}

export interface BusinessSubscriptionSummary {
  plan: string;
  status: string;
  usage_bookings_count: number;
  usage_orders_count: number;
}

export interface BusinessAdminRead {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  timezone: string;
  operating_mode: OperatingMode;
  status: BusinessStatus;
  settings: BusinessSettingsRead;
  subscription: BusinessSubscriptionSummary | null;
  created_at: string;
  updated_at: string;
}

export interface AdminServiceRead {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  type: ServiceType;
  duration_minutes: number | null;
  price_cents: number | null;
  currency: string;
  price_type: PriceType;
  require_payment: boolean;
  is_active: boolean;
  sort_order: number;
  capacity?: number;
  booking_min_notice_minutes?: number;
  booking_window_days?: number | null;
  waitlist_enabled?: boolean;
  metadata: Record<string, unknown>;
  image?: import("@/lib/serviceImage").ServiceImageMedia | null;
  created_at: string;
  updated_at: string;
}

export interface AdminServiceListResponse {
  data: AdminServiceRead[];
  meta: ListMeta;
}

export interface ServiceSlotCapacityOverrideRead {
  id: string;
  business_id: string;
  service_id: string;
  starts_at: string;
  capacity: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceSlotCapacityOverrideListResponse {
  data: ServiceSlotCapacityOverrideRead[];
}

export interface ServiceSlotCapacityOverrideCreatePayload {
  starts_at: string;
  capacity: number;
  note?: string | null;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string | null;
  type: ServiceType;
  duration_minutes?: number | null;
  price_cents?: number | null;
  currency?: string;
  price_type?: PriceType;
  require_payment?: boolean;
  is_active?: boolean;
  sort_order?: number;
  capacity?: number;
  booking_min_notice_minutes?: number;
  booking_window_days?: number | null;
  waitlist_enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ServiceUpdatePayload {
  name?: string;
  description?: string | null;
  duration_minutes?: number | null;
  price_cents?: number | null;
  currency?: string;
  price_type?: PriceType;
  require_payment?: boolean;
  is_active?: boolean;
  sort_order?: number;
  capacity?: number;
  booking_min_notice_minutes?: number;
  booking_window_days?: number | null;
  waitlist_enabled?: boolean;
  metadata?: Record<string, unknown>;
}
export interface AdminBookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  service_name: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

export interface AdminBookingListResponse {
  data: AdminBookingListItem[];
  meta: ListMeta;
}

export interface AdminBookingClientSummary {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export interface AdminBookingServiceSummary {
  id: string;
  name: string;
  type: ServiceType;
  duration_minutes: number | null;
}

export interface AdminBookingRead {
  id: string;
  business_id: string;
  reference: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  client_notes: string | null;
  admin_notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  service: AdminBookingServiceSummary;
  client: AdminBookingClientSummary;
  created_at: string;
  updated_at: string;
}

export type AdminBookingUpdatePayload = {
  status?: "confirmed" | "completed" | "no_show";
  admin_notes?: string | null;
};

export interface AdminBookingCancelPayload {
  reason?: string | null;
}

export interface AdminOrderListItem {
  id: string;
  reference: string;
  status: OrderStatus;
  service_name: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderListResponse {
  data: AdminOrderListItem[];
  meta: ListMeta;
}

export interface AdminOrderClientSummary {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export interface AdminOrderServiceSummary {
  id: string;
  name: string;
  type: ServiceType;
  price_cents: number | null;
  price_type: PriceType;
  currency: string;
}

export interface AdminOrderRead {
  id: string;
  business_id: string;
  reference: string;
  status: OrderStatus;
  form_data: Record<string, unknown>;
  quoted_price_cents: number | null;
  admin_notes: string | null;
  decline_reason: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  service: AdminOrderServiceSummary;
  client: AdminOrderClientSummary;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderUpdatePayload {
  admin_notes?: string | null;
  quoted_price_cents?: number | null;
}

export interface AdminOrderAcceptPayload {
  quoted_price_cents?: number | null;
  admin_notes?: string | null;
  start_work?: boolean;
}

export interface AdminOrderDeclinePayload {
  decline_reason: string;
  admin_notes?: string | null;
}

export interface AdminOrderCancelPayload {
  reason?: string | null;
}

export interface OrderMessageCreatePayload {
  body: string;
}

export interface ClientListItem {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: ClientSource;
  bookings_count: number;
  orders_count: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListResponse {
  data: ClientListItem[];
  meta: ListMeta;
}

export interface ClientBookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  service_name: string;
  starts_at: string;
  ends_at: string;
}

export interface ClientOrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  service_name: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail {
  id: string;
  business_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: ClientSource;
  bookings_count: number;
  orders_count: number;
  last_activity_at: string | null;
  bookings: ClientBookingSummary[];
  orders: ClientOrderSummary[];
  created_at: string;
  updated_at: string;
}

export interface ClientUpdatePayload {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface WorkingHourRead {
  id: string;
  business_id: string;
  day_of_week: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkingBreakRead {
  id: string;
  business_id: string;
  label: string | null;
  day_of_week: number | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface UnavailableTimeRead {
  id: string;
  business_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSettingsRead {
  slot_interval_minutes: number;
  booking_buffer_minutes: number;
}

export interface ScheduleRead {
  working_hours: WorkingHourRead[];
  breaks: WorkingBreakRead[];
  unavailable_times: UnavailableTimeRead[];
  settings: ScheduleSettingsRead;
}

export interface WorkingHourUpdate {
  day_of_week: number;
  is_open: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
}

export interface WorkingHoursReplaceRequest {
  working_hours: WorkingHourUpdate[];
}

export interface WorkingBreakCreatePayload {
  label?: string | null;
  day_of_week?: number | null;
  starts_at: string;
  ends_at: string;
}

export interface WorkingBreakUpdatePayload {
  label?: string | null;
  day_of_week?: number | null;
  starts_at?: string;
  ends_at?: string;
}

export interface UnavailableTimeCreatePayload {
  starts_at: string;
  ends_at: string;
  reason?: string | null;
}

export interface UnavailableTimeUpdatePayload {
  starts_at?: string;
  ends_at?: string;
  reason?: string | null;
}

export type SuperadminBusinessStatus = "active" | "suspended" | "pending_setup";

export type SubscriptionPlan = "free" | "starter" | "business" | "pro";

export type CheckoutPlanId = "starter" | "business" | "pro";

export interface BillingCheckoutRequest {
  plan: CheckoutPlanId;
}

export interface BillingCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";

export interface SuperadminBusinessListItem {
  id: string;
  name: string;
  slug: string;
  status: SuperadminBusinessStatus;
  operating_mode: OperatingMode;
  owner_email: string | null;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  selected_plan_intent?: SubscriptionPlan | null;
  created_at: string;
  updated_at: string;
}

export interface SuperadminBusinessListResponse {
  data: SuperadminBusinessListItem[];
  meta: ListMeta;
}

export interface SuperadminOwnerRead {
  id: string;
  email: string;
  full_name: string | null;
}

export interface SuperadminSubscriptionRead {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  usage_bookings_count: number;
  usage_orders_count: number;
}

export interface SuperadminBusinessDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: SuperadminBusinessStatus;
  operating_mode: OperatingMode;
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  settings: BusinessSettingsRead;
  selected_plan_intent?: SubscriptionPlan | null;
  selected_plan_intent_source?: string | null;
  selected_plan_intent_recorded_at?: string | null;
  subscription: SuperadminSubscriptionRead | null;
  owner: SuperadminOwnerRead | null;
  created_at: string;
  updated_at: string;
}

export interface SuperadminBusinessUpdatePayload {
  status?: SuperadminBusinessStatus;
  plan?: SubscriptionPlan;
}

export interface AuditLogRead {
  id: string;
  actor_user_id: string | null;
  business_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogListResponse {
  data: AuditLogRead[];
  meta: ListMeta;
}

export type LegalConsentSource = "registration" | "public_booking" | "public_order";
export type LegalConsentEntityType = "business" | "booking" | "order";

export interface LegalConsentRecordItem {
  id: string;
  business_id: string | null;
  user_id: string | null;
  client_id: string | null;
  source: LegalConsentSource;
  entity_type: LegalConsentEntityType;
  entity_id: string | null;
  legal_consent_version: string;
  accepted_at: string;
  created_at: string;
  business_name?: string | null;
}

export interface LegalConsentRecordListResponse {
  data: LegalConsentRecordItem[];
  meta: ListMeta;
}
