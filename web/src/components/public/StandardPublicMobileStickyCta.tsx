type StandardPublicMobileStickyCtaProps = {
  hasBookingServices: boolean;
  hasRequestServices: boolean;
  hasServices: boolean;
  isLoading?: boolean;
};

function StickyCtaButton({
  href,
  label,
  variant,
  testId,
  fullWidth,
}: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
  testId: string;
  fullWidth?: boolean;
}) {
  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800"
      : "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50";

  return (
    <a
      href={href}
      className={`${className} ${fullWidth ? "w-full" : "flex-1"}`}
      data-testid={testId}
    >
      {label}
    </a>
  );
}

export function StandardPublicMobileStickyCta({
  hasBookingServices,
  hasRequestServices,
  hasServices,
  isLoading = false,
}: StandardPublicMobileStickyCtaProps) {
  if (isLoading) {
    return null;
  }

  const showBook = hasBookingServices;
  const showRequest = hasRequestServices;
  const showViewServices = !showBook && !showRequest && hasServices;

  if (!showBook && !showRequest && !showViewServices) {
    return null;
  }

  const showBoth = showBook && showRequest;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 md:hidden"
      data-testid="standard-public-mobile-sticky-cta"
    >
      <div className="mx-auto flex max-w-7xl gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {showBook ? (
          <StickyCtaButton
            href="#services-booking"
            label="Book online"
            variant="primary"
            testId="standard-public-mobile-sticky-book"
            fullWidth={!showBoth}
          />
        ) : null}
        {showRequest ? (
          <StickyCtaButton
            href="#services-requests"
            label="Request service"
            variant={showBoth ? "secondary" : "primary"}
            testId="standard-public-mobile-sticky-request"
            fullWidth={!showBoth}
          />
        ) : null}
        {showViewServices ? (
          <StickyCtaButton
            href="#services"
            label="View services"
            variant="primary"
            testId="standard-public-mobile-sticky-view-services"
            fullWidth
          />
        ) : null}
      </div>
    </div>
  );
}
