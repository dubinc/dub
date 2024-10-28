import { DOTS_API_KEY, DOTS_CLIENT_ID } from "./env";

export const getBasicAuthToken = () => {
  return Buffer.from(`${DOTS_CLIENT_ID}:${DOTS_API_KEY}`).toString("base64");
};

export const dotsHeaders = ({ dotsAppId }: { dotsAppId?: string } = {}) => {
  return {
    Authorization: `Basic ${getBasicAuthToken()}`,
    "Content-Type": "application/json",
    ...(dotsAppId ? { "Api-App-Id": dotsAppId } : {}),
  };
};
