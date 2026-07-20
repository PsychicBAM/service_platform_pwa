export type NotificationTemplateKey = "review_request";

export type NotificationTemplate = {
  subject: string;
  body: string;
  enabled: boolean;
};

export type NotificationTemplatesMap = {
  review_request: NotificationTemplate;
};

export const REVIEW_REQUEST_ALLOWED_VARIABLES = [
  "business_name",
  "client_name",
  "service_name",
  "review_link",
  "booking_reference",
  "order_reference",
  "request_reference",
  "business_public_url",
  "expire_days",
] as const;

export const DEFAULT_REVIEW_REQUEST_SUBJECT =
  "Review your experience with {business_name}";

export const DEFAULT_REVIEW_REQUEST_BODY = [
  "Hi {client_name},",
  "",
  "Thank you for choosing {business_name}.",
  "",
  "Please leave a review for your recent {service_name}.",
  "",
  "Review link:",
  "{review_link}",
  "",
  "This link expires in {expire_days} days.",
  "",
  "Thank you,",
  "{business_name}",
].join("\n");

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplatesMap = {
  review_request: {
    subject: DEFAULT_REVIEW_REQUEST_SUBJECT,
    body: DEFAULT_REVIEW_REQUEST_BODY,
    enabled: true,
  },
};

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export function extractTemplateVariables(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    found.add(match[1]);
  }
  return [...found];
}

export function findUnknownTemplateVariables(text: string): string[] {
  const allowed = new Set<string>(REVIEW_REQUEST_ALLOWED_VARIABLES);
  return extractTemplateVariables(text).filter((name) => !allowed.has(name));
}

export function renderNotificationTemplate(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(PLACEHOLDER_RE, (full, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : full,
  );
}

export function resolveNotificationTemplates(
  raw: unknown,
): NotificationTemplatesMap {
  const defaults = {
    review_request: { ...DEFAULT_NOTIFICATION_TEMPLATES.review_request },
  };
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const source = raw as Record<string, unknown>;
  const review = source.review_request;
  if (!review || typeof review !== "object") {
    return defaults;
  }
  const item = review as Record<string, unknown>;
  return {
    review_request: {
      subject:
        String(item.subject || DEFAULT_REVIEW_REQUEST_SUBJECT).trim() ||
        DEFAULT_REVIEW_REQUEST_SUBJECT,
      body:
        String(item.body || DEFAULT_REVIEW_REQUEST_BODY).trim() ||
        DEFAULT_REVIEW_REQUEST_BODY,
      enabled: item.enabled !== false,
    },
  };
}

export function buildReviewRequestPreviewValues(businessName: string): Record<string, string> {
  return {
    business_name: businessName || "Your Business",
    client_name: "Alex",
    service_name: "Arabic Lesson",
    review_link: "https://example.com/r/demo-review-link",
    booking_reference: "BKG-2026-0001",
    order_reference: "",
    request_reference: "",
    business_public_url: "https://example.com/b/demo-business",
    expire_days: "7",
  };
}
