import type { APIRequestContext, APIResponse } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForEmail, type MailHogMessage } from "../mailhog";

const MAILHOG_API = "http://localhost:8025/api";

export async function clearMailHog() {
  await fetch(`${MAILHOG_API}/v1/messages`, { method: "DELETE" });
}

export async function authPost(
  request: APIRequestContext,
  path: string,
  body?: Record<string, unknown>,
) {
  // Better Auth rejects empty bodies when Content-Type is application/json.
  return request.post(`/api/auth${path}`, {
    data: body ?? {},
  });
}

export async function authGet(
  request: APIRequestContext,
  path: string,
  query?: Record<string, string>,
) {
  return request.get(`/api/auth${path}`, {
    params: query,
  });
}

export async function expectJson<T = Record<string, unknown>>(
  response: APIResponse,
  status: number,
): Promise<T> {
  expect(response.status()).toBe(status);
  return (await response.json()) as T;
}

export function extractAuthUrl(message: MailHogMessage): string {
  const body = decodeQuotedPrintable(message.Content.Body);

  const hrefMatches = [
    ...body.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi),
  ].map((match) => decodeHtmlEntities(match[1]!));

  const authHref = hrefMatches.find(
    (href) =>
      href.includes("magic-link/verify") || href.includes("reset-password"),
  );
  if (authHref) {
    return authHref;
  }

  const urlMatch = body.match(
    /https?:\/\/[^\s"'<>]+(?:magic-link\/verify|reset-password)[^\s"'<>]*/i,
  );
  if (urlMatch?.[0]) {
    return decodeHtmlEntities(urlMatch[0]);
  }

  throw new Error("Could not extract auth URL from email body");
}

export function extractTokenFromAuthUrl(url: string): string {
  const parsed = new URL(url);
  const queryToken = parsed.searchParams.get("token");
  if (queryToken) {
    return queryToken;
  }

  const pathMatch = parsed.pathname.match(/\/reset-password\/([^/?#]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  throw new Error(`Could not extract token from auth URL: ${url}`);
}

export async function waitForAuthEmail(to: string) {
  return waitForEmail(to);
}

export async function signInWithEmail(
  request: APIRequestContext,
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
) {
  return authPost(request, "/sign-in/email", { email, password });
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
