import { LegalPlaceholderShell } from "@/pages/legal/LegalPlaceholderShell";

export function PrivacyPage() {
  return (
    <LegalPlaceholderShell title="Privacy Policy (draft)">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Data we may process</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account data — email, name, phone (optional), password hash</li>
          <li>Booking data — service, time, contact details</li>
          <li>Order data — request text, status, messages</li>
          <li>Business profile — name, slug, services, public contact details</li>
          <li>Billing metadata — plan and payment status when Stripe is enabled (no card numbers)</li>
        </ul>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Purposes</h2>
        <p>
          To provide accounts, bookings, orders, notifications, and platform billing. Final lawful
          bases and purposes will be defined with legal review.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Storage and deletion</h2>
        <p>
          Retention periods and deletion procedures are not finalized. A contact process for access
          and erasure requests will be published before public launch.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Contact</h2>
        <p>
          Operator contact details for privacy requests will be added here after legal review
          (placeholder: privacy@your-domain.example).
        </p>
      </section>
    </LegalPlaceholderShell>
  );
}
