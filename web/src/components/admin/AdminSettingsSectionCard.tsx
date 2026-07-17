import type { ReactNode } from "react";

type AdminSettingsSectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  testId?: string;
};

export function AdminSettingsSectionCard({
  title,
  subtitle,
  children,
  className = "",
  headerRight,
  testId,
}: AdminSettingsSectionCardProps) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
      data-testid={testId}
    >
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-gray-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 max-w-3xl text-sm leading-snug text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}
