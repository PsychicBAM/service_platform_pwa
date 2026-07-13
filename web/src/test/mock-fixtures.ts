import type {
  AdminServiceRead,
  AuditLogRead,
  BusinessAdminRead,
  MeResponse,
  MyBookingDetail,
  MyOrderDetail,
  MyOrderListItem,
  OrderMessageRead,
  PublicBusiness,
  PublicService,
  ScheduleRead,
  SuperadminBusinessListItem,
  WaitlistEntryRead,
} from "@/types/api";

export const DEMO_SLUG = "demo-business";
export const BOOKING_SERVICE_ID = "booking-service-id";
export const ORDER_SERVICE_ID = "order-service-id";
export const BUSINESS_ID = "business-id-001";
export const ORDER_ID = "order-id-001";

export const mockPublicBusiness: PublicBusiness = {
  id: BUSINESS_ID,
  name: "Demo Service Business",
  slug: DEMO_SLUG,
  description: "A demo business for smoke tests.",
  logo_url: null,
  operating_mode: "both",
  contact_phone: "+10000000001",
  address: "123 Demo Street",
  average_rating: 4.8,
  review_count: 24,
  public_page_variant: "standard",
  miniSiteConfig: null,
};

export const mockBookingService: PublicService = {
  id: BOOKING_SERVICE_ID,
  name: "Arabic Lesson",
  description: "One-hour language session.",
  type: "booking",
  duration_minutes: 60,
  price_cents: 5000,
  currency: "USD",
  price_type: "fixed",
  require_payment: false,
  sort_order: 1,
};

export const mockOrderService: PublicService = {
  id: ORDER_SERVICE_ID,
  name: "Build Telegram Bot",
  description: "Custom bot development.",
  type: "order",
  duration_minutes: null,
  price_cents: null,
  currency: "USD",
  price_type: "quote",
  require_payment: false,
  sort_order: 2,
};

export const mockOwnerUser: MeResponse = {
  id: "owner-user-id",
  email: "owner@example.com",
  full_name: "Demo Owner",
  role: "business_admin",
  businesses: [
    {
      id: BUSINESS_ID,
      name: "Demo Service Business",
      slug: DEMO_SLUG,
      role: "owner",
    },
  ],
};

export const mockClientUser: MeResponse = {
  id: "client-user-id",
  email: "client@example.com",
  full_name: "Client Demo",
  role: "client",
  email_verified: true,
  businesses: [],
};

export const mockUnverifiedClientUser: MeResponse = {
  ...mockClientUser,
  email_verified: false,
};

export const mockSuperadminUser: MeResponse = {
  id: "superadmin-user-id",
  email: "superadmin@example.com",
  full_name: "Demo Superadmin",
  role: "superadmin",
  businesses: [],
};

export const mockMyOrder: MyOrderListItem = {
  id: ORDER_ID,
  reference: "ORD-2026-0001",
  status: "in_progress",
  business: {
    id: BUSINESS_ID,
    name: "Demo Service Business",
    slug: DEMO_SLUG,
  },
  service: {
    id: ORDER_SERVICE_ID,
    name: "Build Telegram Bot",
    type: "order",
    price_cents: null,
    price_type: "quote",
    currency: "USD",
  },
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
  last_message_preview: "Hello from client",
  can_cancel: true,
};

export const mockMyBookingDetail: MyBookingDetail = {
  id: "booking-id-001",
  reference: "BKG-2026-0002",
  status: "pending",
  business: {
    id: BUSINESS_ID,
    name: "Demo Service Business",
    slug: DEMO_SLUG,
  },
  service: {
    id: BOOKING_SERVICE_ID,
    name: "Arabic Lesson",
  },
  starts_at: "2026-07-01T10:00:00Z",
  ends_at: "2026-07-01T11:00:00Z",
  client_notes: null,
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  can_cancel: true,
  can_reschedule: true,
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
};

export const mockMyOrderDetail: MyOrderDetail = {
  id: ORDER_ID,
  reference: "ORD-2026-0001",
  status: "in_progress",
  business: mockMyOrder.business,
  service: mockMyOrder.service,
  form_data: { details: "I need a Telegram bot." },
  quoted_price_cents: null,
  decline_reason: null,
  created_at: "2026-06-30T10:00:00Z",
  updated_at: "2026-06-30T10:00:00Z",
  accepted_at: "2026-06-30T11:00:00Z",
  completed_at: null,
  can_cancel: true,
};

export const mockOrderMessage: OrderMessageRead = {
  id: "message-id-001",
  order_id: ORDER_ID,
  business_id: BUSINESS_ID,
  sender_type: "client",
  sender_user_id: mockClientUser.id,
  body: "Hello, I added more details for the project.",
  read_at: null,
  created_at: "2026-06-30T12:00:00Z",
};

export const mockAdminBusiness: BusinessAdminRead = {
  id: BUSINESS_ID,
  name: "Demo Service Business",
  slug: DEMO_SLUG,
  description: null,
  logo_url: null,
  contact_email: "owner@example.com",
  contact_phone: null,
  address: null,
  timezone: "Europe/Moscow",
  operating_mode: "both",
  status: "active",
  settings: {
    auto_confirm_bookings: false,
    cancellation_hours: 24,
    max_advance_booking_days: 60,
    min_advance_booking_hours: 2,
    allow_guest_checkout: true,
    slot_interval_minutes: 30,
    booking_buffer_minutes: 0,
    require_payment_default: false,
    notification_email_enabled: true,
  },
  subscription: {
    plan: "free",
    status: "active",
    usage_bookings_count: 1,
    usage_orders_count: 1,
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const mockAdminServices: AdminServiceRead[] = [
  {
    id: BOOKING_SERVICE_ID,
    business_id: BUSINESS_ID,
    name: "Arabic Lesson",
    description: null,
    type: "booking",
    duration_minutes: 60,
    price_cents: 5000,
    currency: "USD",
    price_type: "fixed",
    require_payment: false,
    is_active: true,
    sort_order: 1,
    waitlist_enabled: true,
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: ORDER_SERVICE_ID,
    business_id: BUSINESS_ID,
    name: "Build Telegram Bot",
    description: null,
    type: "order",
    duration_minutes: null,
    price_cents: null,
    currency: "USD",
    price_type: "quote",
    require_payment: false,
    is_active: true,
    sort_order: 2,
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

export const mockSchedule: ScheduleRead = {
  working_hours: [
    {
      id: "wh-1",
      business_id: BUSINESS_ID,
      day_of_week: 1,
      is_open: true,
      opens_at: "09:00:00",
      closes_at: "17:00:00",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  breaks: [],
  unavailable_times: [],
  settings: {
    slot_interval_minutes: 30,
    booking_buffer_minutes: 0,
  },
};

export const mockSuperadminBusiness: SuperadminBusinessListItem = {
  id: BUSINESS_ID,
  name: "Demo Service Business",
  slug: DEMO_SLUG,
  status: "active",
  operating_mode: "both",
  owner_email: "owner@example.com",
  plan: "free",
  subscription_status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const mockAuditLog: AuditLogRead = {
  id: "audit-log-001",
  actor_user_id: mockSuperadminUser.id,
  business_id: BUSINESS_ID,
  action: "business.status_updated",
  target_type: "business",
  target_id: BUSINESS_ID,
  metadata: { from: "pending_setup", to: "active" },
  created_at: "2026-06-01T10:00:00Z",
};

export const emptyListMeta = { page: 1, limit: 50, total: 0 };

export const mockLegalConsentRecords = {
  data: [
    {
      id: "consent-record-001",
      business_id: BUSINESS_ID,
      user_id: "owner-user-id",
      client_id: null,
      source: "registration" as const,
      entity_type: "business" as const,
      entity_id: BUSINESS_ID,
      legal_consent_version: "draft-placeholder-v1",
      accepted_at: "2026-01-02T10:00:00Z",
      created_at: "2026-01-02T10:00:00Z",
    },
    {
      id: "consent-record-002",
      business_id: BUSINESS_ID,
      user_id: null,
      client_id: "client-id-001",
      source: "public_booking" as const,
      entity_type: "booking" as const,
      entity_id: "booking-id-001",
      legal_consent_version: "draft-placeholder-v1",
      accepted_at: "2026-01-03T12:00:00Z",
      created_at: "2026-01-03T12:00:00Z",
    },
  ],
  meta: { page: 1, limit: 25, total: 2 },
};

export const mockSuperadminLegalConsentRecords = {
  data: mockLegalConsentRecords.data.map((record) => ({
    ...record,
    business_name: "Demo Service Business",
  })),
  meta: mockLegalConsentRecords.meta,
};

export const WAITLIST_ENTRY_ID = "waitlist-entry-001";

export const mockWaitlistEntries: WaitlistEntryRead[] = [
  {
    id: WAITLIST_ENTRY_ID,
    business_id: BUSINESS_ID,
    service_id: BOOKING_SERVICE_ID,
    service_name: "Arabic Lesson",
    starts_at: "2026-06-23T10:00:00-04:00",
    customer_name: "Jane Waitlist",
    customer_email: "jane@example.com",
    customer_phone: "+15551234567",
    note: "Prefer morning",
    status: "waiting",
    created_at: "2026-06-20T08:00:00Z",
    updated_at: "2026-06-20T08:00:00Z",
  },
];
