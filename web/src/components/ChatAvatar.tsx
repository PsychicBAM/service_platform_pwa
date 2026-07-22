import { useState } from "react";

type ChatAvatarProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
  fallbackClassName?: string;
  testId?: string;
  fallbackTestId?: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ChatAvatar({
  name,
  logoUrl,
  size = "md",
  fallbackClassName,
  testId = "chat-avatar",
  fallbackTestId = "chat-avatar-fallback",
}: ChatAvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const textClass = size === "sm" ? "text-xs" : "text-xs";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        data-testid={testId}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        fallbackClassName ?? "bg-emerald-100 text-emerald-800"
      } ${textClass}`}
      data-testid={fallbackTestId}
      aria-hidden="true"
    >
      {initials(name) || "?"}
    </span>
  );
}
