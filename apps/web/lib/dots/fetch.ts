import { DubApiError, httpStatusToErrorCode } from "../api/errors";

type DotsRequestConfig = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  dotsAppId?: string | "default";
  body?: any;
  textResponse?: boolean;
};

export const dotsFetch = async (
  endpoint: string,
  { method, dotsAppId, body, textResponse }: DotsRequestConfig,
) => {
  const response = await fetch(`${process.env.DOTS_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.DOTS_CLIENT_ID}:${process.env.DOTS_API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(dotsAppId
        ? {
            "Api-App-Id":
              dotsAppId === "default"
                ? process.env.DOTS_DEFAULT_APP_ID
                : dotsAppId,
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const error = await response.json();

    console.error("Dots API error", error);

    throw new DubApiError({
      code: httpStatusToErrorCode[response.status],
      message: error.message,
    });
  }

  return textResponse ? response.text() : response.json();
};
