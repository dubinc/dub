import { APPLICATION_ID_COOKIE } from "./constants";
import type {
  TrackApplicationEventName,
  TrackApplicationInput,
} from "./schema";

type ApplicationTrackingParams = Pick<
  TrackApplicationInput,
  "referrerUsername" | "programId" | "programSlug" | "source"
>;

function buildPayload(
  params: ApplicationTrackingParams & {
    eventName: TrackApplicationEventName;
    applicationId?: string;
  },
): Record<string, string> {
  const {
    eventName,
    applicationId,
    referrerUsername,
    programId,
    programSlug,
    source,
  } = params;

  return {
    eventName,
    ...(applicationId && { applicationId }),
    ...(referrerUsername && { referrerUsername }),
    ...(programId && { programId }),
    ...(programSlug && { programSlug }),
    ...(source && { source }),
  };
}

async function postEvent(payload: Record<string, string>): Promise<Response> {
  return fetch("/api/track/application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function getApplicationIdFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${APPLICATION_ID_COOKIE}=`));

  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

function hasTrackingContext(params: ApplicationTrackingParams): boolean {
  return !!(
    params.referrerUsername ||
    params.programId ||
    params.programSlug ||
    params.source
  );
}

async function getOrCreateApplicationId(
  params: ApplicationTrackingParams = {},
): Promise<string | null> {
  const existing = getApplicationIdFromCookie();
  if (existing) {
    return existing;
  }

  if (!hasTrackingContext(params)) {
    return null;
  }

  const response = await postEvent(
    buildPayload({
      ...params,
      eventName: "visit",
    }),
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data.applicationId ?? null;
}

// Use this function to track application events
export async function trackApplicationEvent(
  params: TrackApplicationInput,
): Promise<string | null> {
  const context: ApplicationTrackingParams = {
    referrerUsername: params.referrerUsername,
    programId: params.programId,
    programSlug: params.programSlug,
    source: params.source,
  };

  let applicationId: string | null = params.applicationId ?? null;

  if (applicationId == null) {
    if (params.eventName === "visit" && !hasTrackingContext(context)) {
      return getApplicationIdFromCookie();
    }

    applicationId = await getOrCreateApplicationId(context);
  }

  if (!applicationId && params.eventName !== "visit") {
    return null;
  }

  const payload = buildPayload({
    ...params,
    applicationId: applicationId ?? undefined,
  });

  await postEvent(payload);

  return applicationId;
}
