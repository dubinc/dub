import { JWT } from "google-auth-library";
import * as z from "zod/v4";
import { GOOGLE_DATA_MANAGER_SCOPE } from "./constants";
import { googleAdsEnv } from "./env";

const serviceAccountKeySchema = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
});

type ServiceAccountKey = z.infer<typeof serviceAccountKeySchema>;

let cachedServiceAccountKey: ServiceAccountKey | null = null;
let cachedJwtClient: JWT | null = null;

export const parseServiceAccountKey = (): ServiceAccountKey => {
  if (cachedServiceAccountKey) {
    return cachedServiceAccountKey;
  }

  const raw = googleAdsEnv.GOOGLE_DATA_PARTNER_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "[Google Ads] Missing GOOGLE_DATA_PARTNER_SERVICE_ACCOUNT_JSON.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "[Google Ads] GOOGLE_DATA_PARTNER_SERVICE_ACCOUNT_JSON is not valid JSON.",
    );
  }

  const result = serviceAccountKeySchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      "[Google Ads] GOOGLE_DATA_PARTNER_SERVICE_ACCOUNT_JSON is missing required fields (client_email, private_key, project_id).",
    );
  }

  cachedServiceAccountKey = result.data;

  return cachedServiceAccountKey;
};

const getJwtClient = (): JWT => {
  if (cachedJwtClient) {
    return cachedJwtClient;
  }

  const { client_email, private_key } = parseServiceAccountKey();

  cachedJwtClient = new JWT({
    email: client_email,
    key: private_key.replace(/\\n/g, "\n"),
    scopes: [GOOGLE_DATA_MANAGER_SCOPE],
  });

  return cachedJwtClient;
};

export const getDataPartnerAccessToken = async (): Promise<string> => {
  const client = getJwtClient();
  const { token } = await client.getAccessToken();

  if (!token) {
    throw new Error(
      "[Google Ads] Failed to obtain data partner access token from service account.",
    );
  }

  return token;
};
