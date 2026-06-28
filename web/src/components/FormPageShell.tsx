import type { ReactNode } from "react";

type FormPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function FormPageShell({ children, className = "" }: FormPageShellProps) {
  return (
    <section className={`mx-auto w-full max-w-2xl space-y-4 ${className}`.trim()}>
      {children}
    </section>
  );
}
