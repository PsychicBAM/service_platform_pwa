import { getAccessToken } from "@/utils/authStorage";
import { getApiBaseUrl, isAuthRefreshEligible, tryRefreshStoredAccessToken } from "@/api/authRefresh";
import { ApiClientError } from "@/api/client";
import {
  mapMiniSiteImageMediaFromWire,
  type MiniSiteImageMedia,
  type MiniSiteImageMediaWire,
} from "@/lib/miniSiteMedia";
import type { MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteMediaUploadResponse = {
  template: MiniSiteTemplate;
  slot: string;
  media: MiniSiteImageMedia;
};

type MiniSiteMediaUploadWire = {
  template: MiniSiteTemplate;
  slot: string;
  media: MiniSiteImageMediaWire;
};

function miniSiteMediaUploadPath(businessId: string | number): string {
  return `/businesses/${encodeURIComponent(String(businessId))}/mini-site-media/upload`;
}

function miniSiteMediaRemovePath(businessId: string | number, template: MiniSiteTemplate, slot: string): string {
  const params = new URLSearchParams({ template, slot });
  return `/businesses/${encodeURIComponent(String(businessId))}/mini-site-media?${params.toString()}`;
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

  const path = miniSiteMediaUploadPath(businessId);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (
    response.status === 401 &&
    !retried &&
    isAuthRefreshEligible(path)
  ) {
    const refreshed = await tryRefreshStoredAccessToken();
    if (refreshed) {
      return uploadRequest(businessId, formData, true);
    }
  }

  return response;
}

export async function uploadMiniSiteMedia(
  businessId: string | number,
  file: File,
  options: { template: MiniSiteTemplate; slot: string; alt?: string },
): Promise<MiniSiteMediaUploadResponse> {
  const formData = new FormData();
  formData.append("template", options.template);
  formData.append("slot", options.slot);
  formData.append("file", file);
  if (options.alt) {
    formData.append("alt", options.alt);
  }

  const response = await uploadRequest(businessId, formData);
  if (!response.ok) {
    throw await parseUploadError(response);
  }

  const wire = (await response.json()) as MiniSiteMediaUploadWire;
  const media = mapMiniSiteImageMediaFromWire(wire.media);
  if (!media) {
    throw new ApiClientError(500, "INVALID_RESPONSE", "Upload response did not include valid media metadata.");
  }

  return {
    template: wire.template,
    slot: wire.slot,
    media,
  };
}

export async function removeMiniSiteMedia(
  businessId: string | number,
  options: { template: MiniSiteTemplate; slot: string },
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const path = miniSiteMediaRemovePath(businessId, options.template, options.slot);
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw await parseUploadError(response);
  }
}
