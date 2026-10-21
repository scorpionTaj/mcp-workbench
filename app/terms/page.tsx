import Link from "next/link";
import { billingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

const operator = process.env.LEGAL_ENTITY_NAME || "[Set LEGAL_ENTITY_NAME before launch]";
const contact = process.env.SUPPORT_EMAIL || "[Set SUPPORT_EMAIL before launch]";
const address = process.env.LEGAL_ENTITY_ADDRESS || "[Set LEGAL_ENTITY_ADDRESS before launch]";
const effectiveDate = process.env.LEGAL_EFFECTIVE_DATE || "[Set LEGAL_EFFECTIVE_DATE before launch]";
const billingEnabled = billingConfig().enabled;

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/sign-up" className="text-sm text-primary hover:underline">MCP Workbench Cloud</Link>
        <h1 className="text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          Starter terms. The operator must complete the highlighted business details and have these terms reviewed for its jurisdiction before launch.
        </p>
        <p>
          These terms govern your use of MCP Workbench Cloud, operated by {operator}, at {address}.
          Contact: <a className="text-primary underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <p>You must provide accurate account information and protect your sign-in credentials. You are responsible for activity on your account and for keeping any API keys or connected-service credentials you add secure.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your content and connected services</h2>
        <p>You keep your rights to content you submit. You authorize the service to store and process it to provide the features you request. Prompts, files, and tool inputs may be sent to the model providers, MCP servers, or other services you choose to connect; their own terms and privacy policies apply.</p>
        <p>Model responses can be incomplete or incorrect. Review outputs before relying on them, especially for decisions that affect people, money, safety, or legal rights. You are responsible for ensuring that your use of connected tools and generated content is lawful.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Plans and payment</h2>
        {billingEnabled ? (
          <p>Paid plans are billed at the amount and interval shown on Stripe Checkout. Stripe processes payments. You can manage or cancel a subscription from the billing page; cancellation takes effect as described in checkout and the customer portal. Taxes, refunds, and mandatory consumer rights follow the checkout disclosures and applicable law.</p>
        ) : (
          <p>Paid subscriptions are not currently enabled for this deployment. If paid plans are enabled later, the price, billing interval, and cancellation terms will be shown before you subscribe.</p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Acceptable use and availability</h2>
        <p>Do not use the service to break the law, violate another person’s rights, bypass security controls, or interfere with the service or other users. We may suspend access when needed to protect users or the service. We may change or discontinue features with reasonable notice where required by law.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ending an account</h2>
        <p>You can export your account data or request account deletion in Settings. Deleting an account cancels its active subscription and removes associated account data and files from the live service. Backups may retain copies until the operator’s backup retention period expires.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Governing terms</h2>
        <p>Complete this section with the governing law, venue, liability limits, warranty terms, and any consumer disclosures that apply to the operator and its customers before launch.</p>
      </section>
      <footer className="border-t border-border pt-5 text-sm text-muted-foreground">
        <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
      </footer>
    </main>
  );
}
