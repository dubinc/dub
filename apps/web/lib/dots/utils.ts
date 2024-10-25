import { DOTS_API_KEY, DOTS_CLIENT_ID } from "./env";

export const getBasicAuthToken = () => {
  return Buffer.from(`${DOTS_CLIENT_ID}:${DOTS_API_KEY}`).toString("base64");
};

export const dotsHeaders = () => {
  return {
    Authorization: `Basic ${getBasicAuthToken()}`,
    "Content-Type": "application/json",
  };
};
