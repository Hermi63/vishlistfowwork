/**
 * Используем NEXT_PUBLIC_API_URL напрямую — принудительно HTTPS для продакшна.
 * Это устраняет ошибку Mixed Content, когда Vercel rewrite делал redirect на http://.
 */
const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Принудительно HTTPS для всех не-localhost URL
const API_URL = /localhost|127\.0\.0\.1/.test(_rawApiUrl)
  ? _rawApiUrl
  : _rawApiUrl.replace(/^http:\/\//, "https://");

/**
 * Безопасность: санитизация параметров для URL — предотвращает path traversal
 * Удаляет спецсимволы, которые могут изменить путь запроса
 */
function sanitizePathParam(param: string | number): string {
  return String(param).replace(/[^a-zA-Z0-9_\-]/g, "");
}

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

  // Безопасность: все параметры пути санитизируются для предотвращения path traversal
  getWishlist: (slug: string) => request(`/api/wishlists/${sanitizePathParam(slug)}`),

  updateWishlist: (slug: string, data: Record<string, unknown>) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteWishlist: (slug: string) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}`, { method: "DELETE" }),

  // Items
  addItem: (slug: string, data: Record<string, unknown>) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/`, { method: "POST", body: JSON.stringify(data) }),

  updateItem: (slug: string, itemId: number, data: Record<string, unknown>) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteItem: (slug: string, itemId: number) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}`, { method: "DELETE" }),

  // Reserve
  reserveItem: (slug: string, itemId: number, name: string) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}/reserve`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  unreserveItem: (slug: string, itemId: number) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}/reserve`, { method: "DELETE" }),

  // Contribute
  contribute: (slug: string, itemId: number, name: string, amount: number) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}/contribute`, {
      method: "POST",
      body: JSON.stringify({ name, amount }),
    }),

  removeContribution: (slug: string, itemId: number, contributionId: number) =>
    request(`/api/wishlists/${sanitizePathParam(slug)}/items/${sanitizePathParam(itemId)}/contribute/${sanitizePathParam(contributionId)}`, {
      method: "DELETE",
    }),

  // Link preview
  linkPreview: (url: string) =>
    request("/api/link-preview", { method: "POST", body: JSON.stringify({ url }) }),
};

export function getWsUrl(slug: string): string {
  // Безопасность: санитизация slug перед использованием в WebSocket URL
  const safeSlug = sanitizePathParam(slug);
  // WebSocket напрямую к бэкенду, принудительно WSS для не-localhost
  const safeUrl = /localhost|127\.0\.0\.1/.test(_rawApiUrl)
    ? _rawApiUrl
    : _rawApiUrl.replace(/^http:\/\//, "https://");
  const wsBase = safeUrl.replace(/^https/, "wss").replace(/^http(?!s)/, "ws");
  return `${wsBase}/ws/${safeSlug}`;
}
