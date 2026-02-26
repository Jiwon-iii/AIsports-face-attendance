export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const ADMIN_CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_ADMIN_CSRF_COOKIE_NAME ?? "admin_csrf";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function shouldAttachCsrfToken(method: string): boolean {
  const normalized = method.toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers);

  if (shouldAttachCsrfToken(method)) {
    const csrfToken = readCookie(ADMIN_CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "요청 처리에 실패했습니다.");
  }

  return payload.data;
}
