import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Self-hosters point providers at Ollama/LM Studio on their LAN; a public deployment must not
// let users make the server fetch internal addresses (SSRF). Default: allowed outside production.
const allowPrivate = () =>
  process.env.ALLOW_PRIVATE_PROVIDER_URLS
    ? process.env.ALLOW_PRIVATE_PROVIDER_URLS === "true"
    : process.env.NODE_ENV !== "production";

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
    return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast / reserved
  );
}

/**
 * Returns an error message if `url` is not an acceptable provider/MCP endpoint, else null.
 * ponytail: checks DNS at save time only; a rebinding host could resolve differently at fetch
 * time. Pin the resolved IP in a custom fetch agent if that threat matters.
 */
export async function checkOutboundUrl(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid URL";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "URL must be http(s)";
  if (allowPrivate()) return null;
  if (parsed.protocol !== "https:") return "URL must use https";

  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : await lookup(host, { all: true }).then(
        (r) => r.map((a) => a.address),
        () => [] as string[],
      );
  if (!addresses.length) return "Host does not resolve";
  if (addresses.some(isPrivateAddress)) return "URL points to a private network address";
  return null;
}
