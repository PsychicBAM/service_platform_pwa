import type { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageShell({ children, className = "space-y-6" }: AuthPageShellProps) {
  return (
    <section className={`mx-auto w-full max-w-md ${className}`.trim()}>{children}</section>
  );
}
