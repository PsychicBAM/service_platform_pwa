import { getAccessToken } from "@/utils/authStorage";
import { getApiBaseUrl, isAuthRefreshEligible, tryRefreshStoredAccessToken } from "@/api/authRefresh";
import { ApiClientError } from "@/api/client";
import {
  mapServiceImageMediaFromWire,
  type ServiceImageMedia,
  type ServiceImageMediaWire,
} from "@/lib/serviceImage";

export type ServiceImageUploadResponse = {
  service_id: string;
  image: ServiceImageMedia;
};

type ServiceImageUploadWire = {
  service_id: string;
  image: ServiceImageMediaWire;
};

function serviceImageUploadPath(businessId: string | number, serviceId: string): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/services/${encodeURIComponent(serviceId)}/image`;
}

function serviceImageRemovePath(businessId: string | number, serviceId: string): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/services/${encodeURIComponent(serviceId)}/image`;
}

async function parseUploadError(response: Response): Promise<ApiClientError> {
  try {
    const data = (await response.json()) as { error?: { code?: string; message?: string } };
    if (data?.error?.message) {
      return new ApiClientError(response.status, data.error.code ?? "HTTP_ERROR", data.error.message);
    }
  } catch {
    // fall through
  }
  return new ApiClientError(response.status, "HTTP_ERROR", response.statusText || "Upload failed");
}

async function uploadRequest(
  businessId: string | number,
  serviceId: string,
  formData: FormData,
  retried = false,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const path = serviceImageUploadPath(businessId, serviceId);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401 && !retried && isAuthRefreshEligible(path)) {
    const refreshed = await tryRefreshStoredAccessToken();
    if (refreshed) {
      return uploadRequest(businessId, serviceId, formData, true);
    }
  }

  return response;
}

export async function uploadServiceImage(
  businessId: string | number,
  serviceId: string,
  file: File,
): Promise<ServiceImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await uploadRequest(businessId, serviceId, formData);
  if (!response.ok) {
    throw await parseUploadError(response);
  }

  const body = (await response.json()) as ServiceImageUploadWire;
  const image = mapServiceImageMediaFromWire(body.image);
  if (!image) {
    throw new ApiClientError(500, "INVALID_RESPONSE", "Upload response missing image metadata.");
  }

  return {
    service_id: body.service_id,
    image,
  };
}

export async function removeServiceImage(
  businessId: string | number,
  serviceId: string,
): Promise<void> {
  const path = serviceImageRemovePath(businessId, serviceId);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw await parseUploadError(response);
  }
}
