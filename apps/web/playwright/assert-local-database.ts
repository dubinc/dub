const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const LOCAL_URL_HINT =
  "Use the local docker URLs from .env.example: mysql://root:@localhost:3306/planetscale and http://root:unused@localhost:3900/planetscale";

function hostnameFromDatabaseUrl(url: string): string {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  return hostname.toLowerCase();
}

function assertUrl(
  name: "DATABASE_URL" | "PLANETSCALE_DATABASE_URL",
  value: string | undefined,
  required: boolean,
): void {
  if (!value) {
    if (required) {
      throw new Error(
        `${name} is not set. Playwright tests require a local database. ${LOCAL_URL_HINT}`,
      );
    }
    return;
  }

  let hostname: string;
  try {
    hostname = hostnameFromDatabaseUrl(value);
  } catch {
    throw new Error(
      `${name} is not a valid URL. Playwright tests require a local database. ${LOCAL_URL_HINT}`,
    );
  }

  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `Refusing to run Playwright tests: ${name} host "${hostname}" is not a local database. Only localhost / 127.0.0.1 / ::1 are allowed. ${LOCAL_URL_HINT}`,
    );
  }
}

export function assertLocalDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertUrl("DATABASE_URL", env.DATABASE_URL, true);
  assertUrl("PLANETSCALE_DATABASE_URL", env.PLANETSCALE_DATABASE_URL, false);
}
