/**
 * Client-side: always use relative URL so requests go through Vercel/Next.js rewrites.
 * Server-side (SSR): use the full backend URL directly.
 */
const API_URL =
  typeof window !== "undefined"
    ? "" // Browser: same-origin, rewrites proxy to backend
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail;
    const message =
      Array.isArray(detail)
        ? detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(", ")
        : typeof detail === "string"
        ? detail
        : `Request failed: ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const api = {
  register: (data: { email: string; name: string; password: string }) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: () => request("/api/auth/me"),

  googleAuth: (idToken: string) =>
    request("/api/auth/google", { method: "POST", body: JSON.stringify({ id_token: idToken }) }),

  // Wishlists
  getMyWishlists: () => request("/api/wishlists/my"),

  createWishlist: (data: { title: string; description?: string; event_date?: string }) =>
    request("/api/wishlists/", { method: "POST", body: JSON.stringify(data) }),

  getWishlist: (slug: string) => request(`/api/wishlists/${slug}`),

  updateWishlist: (slug: string, data: Record<string, unknown>) =>
    request(`/api/wishlists/${slug}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteWishlist: (slug: string) =>
    request(`/api/wishlists/${slug}`, { method: "DELETE" }),

  // Items
  addItem: (slug: string, data: Record<string, unknown>) =>
    request(`/api/wishlists/${slug}/items/`, { method: "POST", body: JSON.stringify(data) }),

  updateItem: (slug: string, itemId: number, data: Record<string, unknown>) =>
    request(`/api/wishlists/${slug}/items/${itemId}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteItem: (slug: string, itemId: number) =>
    request(`/api/wishlists/${slug}/items/${itemId}`, { method: "DELETE" }),

  // Reserve
  reserveItem: (slug: string, itemId: number, name: string) =>
    request(`/api/wishlists/${slug}/items/${itemId}/reserve`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  unreserveItem: (slug: string, itemId: number) =>
    request(`/api/wishlists/${slug}/items/${itemId}/reserve`, { method: "DELETE" }),

  // Contribute
  contribute: (slug: string, itemId: number, name: string, amount: number) =>
    request(`/api/wishlists/${slug}/items/${itemId}/contribute`, {
      method: "POST",
      body: JSON.stringify({ name, amount }),
    }),

  removeContribution: (slug: string, itemId: number, contributionId: number) =>
    request(`/api/wishlists/${slug}/items/${itemId}/contribute/${contributionId}`, {
      method: "DELETE",
    }),

  // Link preview
  linkPreview: (url: string) =>
    request("/api/link-preview", { method: "POST", body: JSON.stringify({ url }) }),
};

export function getWsUrl(slug: string): string {
  // WebSocket requires an absolute URL — Vercel rewrites don't support WS upgrades.
  // Always connect directly to the backend via NEXT_PUBLIC_API_URL.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // Force HTTPS (→ WSS) for non-localhost to prevent Mixed Content on HTTPS pages.
  const safeUrl = /localhost|127\.0\.0\.1/.test(apiUrl)
    ? apiUrl
    : apiUrl.replace(/^http:\/\//, "https://");
  const wsBase = safeUrl.replace(/^https/, "wss").replace(/^http(?!s)/, "ws");
  return `${wsBase}/ws/${slug}`;
}
