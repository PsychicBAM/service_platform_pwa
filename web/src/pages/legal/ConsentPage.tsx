import { LegalPlaceholderShell } from "@/pages/legal/LegalPlaceholderShell";

export function ConsentPage() {
  return (
    <LegalPlaceholderShell title="Personal Data Processing Consent (draft)">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Consent placeholder</h2>
        <p>
          This page will describe consent to personal data processing where required by applicable
          law. Final wording, checkboxes, and lawful bases are pending legal review.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Your rights</h2>
        <p>
          Users may request access, correction, or deletion of personal data subject to applicable
          law. A formal request process will be published before public launch.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Contact the operator</h2>
        <p>
          Contact details for consent and data-subject requests will be added after legal review
          (placeholder: privacy@your-domain.example).
        </p>
      </section>
    </LegalPlaceholderShell>
  );
}
