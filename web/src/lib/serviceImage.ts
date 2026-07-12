export type ServiceImageMedia = {
  kind: "image";
  url: string;
  thumbnailUrl: string;
  alt: string;
  filename: string;
  contentType: string;
  size: number;
  originalSize: number;
  width: number;
  height: number;
};

export type ServiceImageMediaWire = {
  kind: "image";
  url: string;
  thumbnail_url?: string;
  alt?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  original_size?: number;
  width?: number;
  height?: number;
};

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const SERVICE_IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const SERVICE_IMAGE_MAX_MB = 12;
export const SERVICE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const SERVICE_IMAGE_UPLOAD_HINT = "JPG, PNG, or WebP up to 12 MB.";
export const SERVICE_IMAGE_TOO_LARGE_MESSAGE = `Image is too large. Maximum size is ${SERVICE_IMAGE_MAX_MB} MB.`;
export const SERVICE_IMAGE_INVALID_TYPE_MESSAGE = `Only ${SERVICE_IMAGE_UPLOAD_HINT} are supported.`;

export function isAllowedServiceImageFile(file: File): boolean {
  return ALLOWED_IMAGE_CONTENT_TYPES.has(file.type);
}

function readNonNegativeInt(value: unknown): number {
  return typeof value === "number" && value >= 0 ? value : 0;
}

export function normalizeServiceImageMedia(value: unknown): ServiceImageMedia | null {
  if (typeof value === "string") {
    const url = value.trim();
    if (!url) {
      return null;
    }
    return {
      kind: "image",
      url,
      thumbnailUrl: "",
      alt: "",
      filename: "",
      contentType: "",
      size: 0,
      originalSize: 0,
      width: 0,
      height: 0,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url.trim() : "";
  if (!url) {
    return null;
  }

  const thumbnailUrl =
    typeof record.thumbnailUrl === "string"
      ? record.thumbnailUrl
      : typeof record.thumbnail_url === "string"
        ? record.thumbnail_url
        : "";

  return {
    kind: "image",
    url,
    thumbnailUrl,
    alt: typeof record.alt === "string" ? record.alt : "",
    filename: typeof record.filename === "string" ? record.filename : "",
    contentType:
      typeof record.contentType === "string"
        ? record.contentType
        : typeof record.content_type === "string"
          ? record.content_type
          : "",
    size: readNonNegativeInt(record.size),
    originalSize: readNonNegativeInt(
      record.originalSize ?? record.original_size,
    ),
    width: readNonNegativeInt(record.width),
    height: readNonNegativeInt(record.height),
  };
}

export function mapServiceImageMediaFromWire(
  wire: ServiceImageMediaWire | null | undefined,
): ServiceImageMedia | null {
  return normalizeServiceImageMedia(wire);
}

export function resolveServiceImageUrl(url: string): string {
  if (!url) {
    return "";
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (url.startsWith("/")) {
    return `${apiBase}${url}`;
  }
  return `${apiBase}/${url}`;
}

export function serviceImageStatusText(image: ServiceImageMedia | null): string {
  if (!image) {
    return "No image";
  }
  const filename = image.filename?.trim();
  return filename || "Image added";
}
