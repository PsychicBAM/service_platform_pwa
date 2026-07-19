import { apiClient } from "@/api/client";
import type {
  AuditLogListResponse,
  LegalConsentRecordListResponse,
  PlanChangeRequestResolveResponse,
  PlanChangeRequestStatus,
  SuperadminBusinessDetail,
  SuperadminBusinessListResponse,
  SuperadminBusinessUpdatePayload,
  SuperadminPlanChangeRequestListResponse,
} from "@/types/api";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listSuperadminBusinesses(
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<SuperadminBusinessListResponse>(
    `/superadmin/businesses${buildQuery(params)}`,
  );
}

export function getSuperadminBusiness(businessId: string) {
  return apiClient.get<SuperadminBusinessDetail>(
    `/superadmin/businesses/${encodeURIComponent(businessId)}`,
  );
}

export function updateSuperadminBusiness(
  businessId: string,
  payload: SuperadminBusinessUpdatePayload,
) {
  return apiClient.patch<SuperadminBusinessDetail>(
    `/superadmin/businesses/${encodeURIComponent(businessId)}`,
    payload,
  );
}

export function listAuditLogs(params?: Record<string, string | number | undefined>) {
  return apiClient.get<AuditLogListResponse>(`/superadmin/audit-logs${buildQuery(params)}`);
}

export function getSuperadminLegalConsents(
  params?: Record<string, string | number | undefined>,
) {
  return apiClient.get<LegalConsentRecordListResponse>(
    `/superadmin/legal-consents${buildQuery(params)}`,
  );
}

export function listSuperadminPlanChangeRequests(params?: {
  status?: PlanChangeRequestStatus;
  page?: number;
  limit?: number;
}) {
  return apiClient.get<SuperadminPlanChangeRequestListResponse>(
    `/superadmin/plan-change-requests${buildQuery(params)}`,
  );
}

export function approveSuperadminPlanChangeRequest(requestId: string) {
  return apiClient.post<PlanChangeRequestResolveResponse>(
    `/superadmin/plan-change-requests/${encodeURIComponent(requestId)}/approve`,
  );
}

export function rejectSuperadminPlanChangeRequest(requestId: string) {
  return apiClient.post<PlanChangeRequestResolveResponse>(
    `/superadmin/plan-change-requests/${encodeURIComponent(requestId)}/reject`,
  );
}
