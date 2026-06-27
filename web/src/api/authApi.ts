import { apiClient, setAccessToken } from "@/api/client";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/types/api";

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<LoginResponse>(
    "/auth/login",
    payload,
    { auth: false },
  );
  setAccessToken(response.tokens.access_token);
  return response;
}

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post<RegisterResponse>(
    "/auth/register",
    payload,
    { auth: false },
  );
  setAccessToken(response.tokens.access_token);
  return response;
}

export function getMe() {
  return apiClient.get<MeResponse>("/auth/me");
}
