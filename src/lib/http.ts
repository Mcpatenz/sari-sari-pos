/**
 * CSRF defense: reject requests that are not same-origin.
 *
 * Browsers send `Origin` on non-GET requests and `Sec-Fetch-Site` on all
 * requests. If a value is present it must declare the request same-origin
 * (or "none", which means a non-browser client). Requests with neither header
 * (older clients / curl) pass through so server-to-server sync still works.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch {
      return false;
    }
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;

  return true;
}