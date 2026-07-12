import { useState, type CSSProperties, type ReactNode } from "react";
import {
  normalizeServiceImageMedia,
  resolveServiceImageCardUrl,
  resolveServiceImagePreviewUrl,
  type ServiceImageMedia,
} from "@/lib/serviceImage";

type ServiceImageDisplayProps = {
  image: ServiceImageMedia | unknown | null | undefined;
  variant?: "thumb" | "card" | "detail";
  alt?: string;
  className?: string;
  testId?: string;
};

const variantClassName: Record<NonNullable<ServiceImageDisplayProps["variant"]>, string> = {
  thumb: "h-10 w-10 shrink-0 rounded object-cover",
  card: "block h-full w-full object-cover",
  detail: "block h-full w-full object-cover",
};

export function ServiceImageDisplay({
  image,
  variant = "card",
  alt = "",
  className = "",
  testId,
}: ServiceImageDisplayProps) {
  const [failed, setFailed] = useState(false);
  const normalized = normalizeServiceImageMedia(image);

  if (!normalized || failed) {
    return null;
  }

  const src =
    variant === "thumb"
      ? resolveServiceImagePreviewUrl(normalized)
      : resolveServiceImageCardUrl(normalized);

  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || normalized.alt || ""}
      className={`${variantClassName[variant]} ${className}`.trim()}
      loading="lazy"
      data-testid={testId}
      onError={() => setFailed(true)}
    />
  );
}

export function ServiceCardImageArea({
  image,
  alt = "",
  testId = "service-card-image",
  aspectClassName = "aspect-[16/10]",
}: {
  image: ServiceImageMedia | unknown | null | undefined;
  alt?: string;
  testId?: string;
  aspectClassName?: string;
}) {
  if (!normalizeServiceImageMedia(image)) {
    return null;
  }

  return (
    <div
      className={`${aspectClassName} w-full shrink-0 overflow-hidden bg-slate-100`}
      data-testid="service-card-image-area"
    >
      <ServiceImageDisplay image={image} variant="card" alt={alt} testId={testId} />
    </div>
  );
}

export function ServiceCardNoImageArea({
  children,
  aspectClassName = "aspect-[16/10]",
  testId = "service-card-no-image-area",
  className = "",
  style,
}: {
  children: ReactNode;
  aspectClassName?: string;
  testId?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${aspectClassName} flex w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 ${className}`.trim()}
      data-testid={testId}
      style={style}
    >
      {children}
    </div>
  );
}

export function hasServiceImage(
  image: ServiceImageMedia | unknown | null | undefined,
): boolean {
  return Boolean(normalizeServiceImageMedia(image));
}
