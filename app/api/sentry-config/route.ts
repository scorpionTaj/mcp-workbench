export const dynamic = "force-dynamic";

export function GET() {
  const headers = { "Cache-Control": "no-store" };
  const dsn = process.env.SENTRY_DSN;
  return dsn
    ? Response.json({ dsn }, { headers })
    : new Response(null, { status: 204, headers });
}
