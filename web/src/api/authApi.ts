import { apiClient } from "@/api/client";
import { refreshAccessToken as refreshAccessTokenRequest } from "@/api/authRefresh";
import { clearTokens, setTokens } from "@/utils/authStorage";
import type {
  EmailVerificationResendResponse,
  EmailVerifyRequest,
  EmailVerifyResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/types/api";

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<LoginResponse>(
    "/auth/login",
    payload,
    { auth: false },
  );
  setTokens(response.tokens);
  return response;
}

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post<RegisterResponse>(
    "/auth/register",
    payload,
    { auth: false },
  );
  setTokens(response.tokens);
  return response;
}

export function getMe() {
  return apiClient.get<MeResponse>("/auth/me");
}

export function refreshAccessToken(refresh_token: string): Promise<RefreshResponse> {
  return refreshAccessTokenRequest(refresh_token);
}

export function logout() {
  clearTokens();
}

export function verifyEmail(token: string) {
  const payload: EmailVerifyRequest = { token };
  return apiClient.post<EmailVerifyResponse>("/auth/verify-email", payload, {
    auth: false,
  });
}

export function resendEmailVerification() {
  return apiClient.post<EmailVerificationResendResponse>("/auth/resend-verification");
}
