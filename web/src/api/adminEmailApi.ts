import { apiClient } from "@/api/client";

export type AdminEmailStatus = {
  enabled: boolean;
  dry_run: boolean;
  configured: boolean;
  provider: string;
  host: string | null;
  port: number | null;
  from_email: string | null;
  from_name: string | null;
  status: "disabled" | "dry_run" | "configuration_needed" | "ready" | string;
};

export type AdminEmailTestResult = {
  ok: boolean;
  dry_run: boolean;
  message: string;
  message_code: string;
};

export function getAdminEmailStatus() {
  return apiClient.get<AdminEmailStatus>("/admin/email/status");
}

export function sendAdminTestEmail(toEmail: string) {
  return apiClient.post<AdminEmailTestResult>("/admin/email/test", {
    to_email: toEmail,
  });
}
