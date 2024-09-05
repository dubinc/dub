import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

export const verifyToken = async ({
  dotsUserId,
  token,
}: {
  dotsUserId: string;
  token: string;
}) => {
  const { DOTS_API_URL } = getDotsEnv();
  const authToken = getEncodedCredentials();

  const response = await fetch(`${DOTS_API_URL}/users/${dotsUserId}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
    },
    body: JSON.stringify({
      token,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to verify token: ${data}`);
  }

  console.log("verifyToken", data);

  return data;
};
