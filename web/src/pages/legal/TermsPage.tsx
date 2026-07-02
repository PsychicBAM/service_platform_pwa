import { LegalPlaceholderShell } from "@/pages/legal/LegalPlaceholderShell";

export function TermsPage() {
  return (
    <LegalPlaceholderShell title="Terms of Service (draft)">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Platform use</h2>
        <p>
          This placeholder describes general use of the Service Platform for business owners and
          clients. Final terms will be prepared with legal counsel.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Business accounts</h2>
        <p>
          Business owners manage services, schedules, bookings, and orders. Account holders are
          responsible for accurate business information and lawful use of the platform.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Client bookings and orders</h2>
        <p>
          Clients may submit booking or order requests. Businesses process requests according to
          their own policies. This placeholder does not create contractual obligations between
          parties.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Prohibited misuse</h2>
        <p>
          Users must not abuse the service, attempt unauthorized access, upload unlawful content, or
          interfere with other users. Enforcement details will appear in the final terms.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Billing</h2>
        <p>
          Subscription and payment terms for paid plans will be covered in a separate billing or
          public offer document when live Stripe billing is enabled.
        </p>
      </section>
    </LegalPlaceholderShell>
  );
}
