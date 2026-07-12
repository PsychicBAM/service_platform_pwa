import { useState } from "react";
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
  card: "h-full w-full object-cover",
  detail: "w-full rounded-xl object-cover aspect-[16/10]",
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
