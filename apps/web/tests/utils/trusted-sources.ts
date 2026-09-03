const TRUSTED_OIDC_HEADER = "x-vercel-trusted-oidc-idp-token";
const EARLY_REFRESH_MS = 60_000;

type FetchFn = typeof fetch;

let cachedToken: string | null = null;
let cachedExpiresAtMs = 0;
let inflight: Promise<string | null> | null = null;

/**
 * Headers that bypass Vercel Deployment Protection via Trusted Sources.
 *
 * GitHub Actions OIDC tokens last 5 minutes, so we mint on demand from the
 * runner (`ACTIONS_ID_TOKEN_REQUEST_*`) and refresh before expiry. Falls back
 * to `VERCEL_OIDC_TOKEN` for local runs against a protected preview.
 *
 * @see https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources
 */
export async function getTrustedSourcesHeaders(
  fetchFn: FetchFn = fetch,
): Promise<Record<string, string>> {
  const token = await getOidcToken(fetchFn);
  if (!token) return {};
  return { [TRUSTED_OIDC_HEADER]: token };
}

async function getOidcToken(fetchFn: FetchFn): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < cachedExpiresAtMs - EARLY_REFRESH_MS) {
    return cachedToken;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const minted = await mintFromGitHubActionsRunner(fetchFn);
      if (minted) {
        cachedToken = minted.token;
        cachedExpiresAtMs = minted.expiresAtMs;
        return minted.token;
      }

      const envToken = process.env.VERCEL_OIDC_TOKEN;
      if (envToken) {
        cachedToken = envToken;
        cachedExpiresAtMs = Number.POSITIVE_INFINITY;
        return envToken;
      }

      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function mintFromGitHubActionsRunner(
  fetchFn: FetchFn,
): Promise<{ token: string; expiresAtMs: number } | null> {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !requestToken) return null;

  const res = await fetchFn(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${requestToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to mint GitHub Actions OIDC token: ${res.status} ${res.statusText}`,
    );
  }

  const body = (await res.json()) as { value?: string };
  const token = body.value;
  if (!token) {
    throw new Error(
      "Failed to mint GitHub Actions OIDC token: empty/invalid response body",
    );
  }

  return { token, expiresAtMs: readJwtExpMs(token) };
}

function readJwtExpMs(jwt: string): number {
  const fallback = Date.now() + 5 * 60 * 1000;
  const parts = jwt.split(".");
  if (parts.length !== 3) return fallback;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (typeof payload?.exp === "number") return payload.exp * 1000;
  } catch {
    // ignore — use fallback
  }

  return fallback;
}
