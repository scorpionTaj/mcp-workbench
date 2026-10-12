/**
 * SWR fetcher: throws on non-2xx so error bodies never land in `data`,
 * and sends the user to sign-in when the session has expired.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
