import Link from "next/link";

export const dynamic = "force-dynamic";

const operator = process.env.LEGAL_ENTITY_NAME || "[Set LEGAL_ENTITY_NAME before launch]";
const contact = process.env.PRIVACY_EMAIL || process.env.SUPPORT_EMAIL || "[Set PRIVACY_EMAIL before launch]";
const address = process.env.LEGAL_ENTITY_ADDRESS || "[Set LEGAL_ENTITY_ADDRESS before launch]";
const effectiveDate = process.env.LEGAL_EFFECTIVE_DATE || "[Set LEGAL_EFFECTIVE_DATE before launch]";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/sign-up" className="text-sm text-primary hover:underline">MCP Workbench Cloud</Link>
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          Starter policy. The operator must complete the highlighted business details, retention periods, and applicable privacy rights before launch.
        </p>
        <p>
          This policy describes MCP Workbench Cloud, operated by {operator}, at {address}.
          Privacy contact: <a className="text-primary underline" href={`mailto:${contact}`}>{contact}</a>.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Information we handle</h2>
        <p>The service stores account details, sign-in and verification records, chats and model responses, files and knowledge-base content, settings, connected-service details, usage records, and support feedback. Provider API keys and MCP credentials are encrypted in the application database. Operational logs and scrubbed error reports are used to keep the service reliable.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How information is used</h2>
        <p>We use this information to authenticate accounts, provide the features you request, enforce usage limits, process subscriptions when enabled, answer support requests, and protect and improve the service. We do not use customer content to train a model. The external model or tool providers you connect may process submitted content under their own terms and privacy policies.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Service providers</h2>
        <p>Depending on deployment and your configuration, information may be processed by the hosting and database provider, Stripe for paid subscriptions, the configured email provider, Sentry for scrubbed error reporting, AI model providers, MCP servers, GitHub, and storage providers. Complete this list for the production deployment and link to each provider’s privacy information before launch.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Retention and your choices</h2>
        <p>Account information is kept while the account is active. You can download an account export or delete your account in Settings. Deletion removes account records and associated files from the live service; copies in backups may remain until the configured backup retention period expires. Set and disclose that period before launch.</p>
        <p>Applicable privacy laws may give you additional rights to access, correct, export, restrict, or object to processing. Contact the privacy address above to exercise a right or raise a concern.</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies and security</h2>
        <p>The service uses authentication cookies to keep you signed in and a theme preference in your browser. It does not include advertising cookies. We use technical safeguards such as encrypted credentials, access controls, rate limits, and private file access, but no online service can promise absolute security.</p>
      </section>
      <footer className="border-t border-border pt-5 text-sm text-muted-foreground">
        <Link href="/terms" className="text-primary underline">Terms of Service</Link>
      </footer>
    </main>
  );
}
