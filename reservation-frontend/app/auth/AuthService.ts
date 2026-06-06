export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AuthPayload = {
  email: string;
  password: string;
};

type RegisterPayload = AuthPayload & {
  name: string;
};

export type AuthResult = {
  success: boolean;
  token?: string;
  message: string;
};

async function request(endpoint: string, body: Record<string, string>) {
  // Centralize unauthenticated POST calls so login/register handle success and error payloads the same way.
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      message: data.error || "An unexpected error occurred.",
      token: undefined,
    };
  }

  return {
    success: true,
    message: data.status || "Operation successful.",
    token: data.token,
  };
}

function getStoredToken(): string | null {
  // Services can be imported during server rendering, where browser storage does not exist.
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("reservation_token");
}

export async function storeAuthToken(token: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Keep in localStorage so authorizedRequest can attach it as a Bearer header.
  window.localStorage.setItem("reservation_token", token);

  // Set the httpOnly, Secure cookie via a server-side route so it is unreachable by JavaScript
  // (the middleware reads this cookie to protect routes without exposing the token to the DOM).
  await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("reservation_token");
  // Clear the httpOnly cookie via the server-side route (fire-and-forget is fine here).
  fetch("/api/auth/token", { method: "DELETE" }).catch(() => {});
  window.dispatchEvent(new Event("reservation-auth-changed"));
}

async function authorizedRequest(endpoint: string, init: RequestInit = {}) {
  // Build headers from the caller's init so PUT/GET helpers can add options without losing auth headers.
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    // Backend routes expect Symfony/JWT bearer authentication.
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      message: data.error || "An unexpected error occurred.",
      data: undefined,
    };
  }

  return {
    success: true,
    message: data.status || "Operation successful.",
    data,
  };
}

function decodeJwtPayload(token: string): unknown {
  try {
    // JWT payloads are base64url encoded; convert to browser-safe base64 before decoding.
    const segments = token.split(".");
    if (segments.length < 2) return null;
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    // Decode as UTF-8 instead of plain atob output so non-ASCII names/claims do not break parsing.
    const payload = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function getUserRolesFromToken(token?: string): string[] {
  // Accept an explicit token for tests and default to storage for normal app checks.
  const storedToken = token ?? getStoredToken();
  if (!storedToken) return [];

  const payload = decodeJwtPayload(storedToken);
  if (!payload || typeof payload !== "object") return [];

  const roles = (payload as Record<string, unknown>).roles;
  if (Array.isArray(roles)) {
    // Filter defensively because JWT claims are external input even when they come from our backend.
    return roles.filter((role): role is string => typeof role === "string");
  }

  if (typeof roles === "string") {
    return [roles];
  }

  return [];
}

export function isAuthenticatedUser(): boolean {
  // Authentication depends on having a valid-looking token, not merely any value in storage.
  const token = getStoredToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;

  const expiresAt = (payload as Record<string, unknown>).exp;
  if (typeof expiresAt === "number" && Date.now() >= expiresAt * 1000) {
    // Remove expired tokens immediately so future route checks do not keep retrying stale credentials.
    window.localStorage.removeItem("reservation_token");
    return false;
  }

  return true;
}

export function isAdminUser(): boolean {
  // Check authentication first so invalid or expired tokens are cleaned up before reading role claims.
  if (!isAuthenticatedUser()) return false;
  return getUserRolesFromToken().includes("ROLE_ADMIN");
}

type UserPayload = {
  name: string;
  email: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
};

export type UserResponse = {
  status?: string;
  user: User;
};

export type AuthRequestResult<T = undefined> = {
  success: boolean;
  message: string;
  token?: string;
  data?: T;
};

export const AuthService = {
  login: async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    // Keep component code small by translating backend login responses into a shared AuthResult shape.
    return request("/api/auth/login", { email, password });
  },

  register: async ({ name, email, password }: RegisterPayload): Promise<AuthResult> => {
    // Registration follows the same response contract as login even though it usually returns no token.
    return request("/api/auth/register", { name, email, password });
  },

  logout: () => {
    // Logging out is local state cleanup; protected backend calls will fail once the token is gone.
    clearAuthToken();
  },

  getCurrentUser: async (): Promise<AuthRequestResult<UserResponse>> => {
    // Profile screens use this to hydrate editable user data from the trusted backend record.
    return authorizedRequest("/api/user");
  },

  updateUser: async (payload: Partial<UserPayload>): Promise<AuthRequestResult<UserResponse>> => {
    // Send only changed profile fields so the backend can validate partial updates.
    return authorizedRequest("/api/user", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
