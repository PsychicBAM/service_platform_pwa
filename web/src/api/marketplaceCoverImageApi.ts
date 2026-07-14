import { getAccessToken } from "@/utils/authStorage";
import { getApiBaseUrl, isAuthRefreshEligible, tryRefreshStoredAccessToken } from "@/api/authRefresh";
import { ApiClientError } from "@/api/client";
import {
  mapServiceImageMediaFromWire,
  type ServiceImageMedia,
  type ServiceImageMediaWire,
} from "@/lib/serviceImage";

export type MarketplaceCoverImageUploadResponse = {
  image: ServiceImageMedia;
};

type MarketplaceCoverImageUploadWire = {
  image: ServiceImageMediaWire;
};

function marketplaceCoverPath(businessId: string | number): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/marketplace-cover-image`;
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

  const path = marketplaceCoverPath(businessId);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401 && !retried && isAuthRefreshEligible(path)) {
    const refreshed = await tryRefreshStoredAccessToken();
    if (refreshed) {
      return uploadRequest(businessId, formData, true);
    }
  }

  return response;
}

export async function uploadMarketplaceCoverImage(
  businessId: string | number,
  file: File,
): Promise<MarketplaceCoverImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await uploadRequest(businessId, formData);
  if (!response.ok) {
    throw await parseUploadError(response);
  }

  const body = (await response.json()) as MarketplaceCoverImageUploadWire;
  const image = mapServiceImageMediaFromWire(body.image);
  if (!image) {
    throw new ApiClientError(500, "INVALID_RESPONSE", "Upload response missing image metadata.");
  }

  return { image };
}

export async function removeMarketplaceCoverImage(businessId: string | number): Promise<void> {
  const path = marketplaceCoverPath(businessId);
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
