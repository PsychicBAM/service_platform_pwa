import { LegalPlaceholderShell } from "@/pages/legal/LegalPlaceholderShell";

export function CookiesPage() {
  return (
    <LegalPlaceholderShell title="Cookie Policy (draft)">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Current status</h2>
        <p>
          The platform does not use third-party analytics or advertising cookies in this MVP build.
          Essential session and authentication storage may be used for login and app functionality.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Future analytics</h2>
        <p>
          If analytics or non-essential cookies are added later, this policy and the site UI will
          be updated. Consent mechanisms may be required before public launch in some jurisdictions.
        </p>
      </section>
    </LegalPlaceholderShell>
  );
}
