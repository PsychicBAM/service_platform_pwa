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

export interface PublicOrderCreate {
  service_id: string;
  form_data?: Record<string, unknown>;
  client: PublicBookingClientInput;
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
