import { getDotsEnv } from "./env";
import { getEncodedCredentials } from "./utils";

export const sendVerificationToken = async ({
  dotsUserId,
}: {
  dotsUserId: string;
}) => {
  const { DOTS_API_URL } = getDotsEnv();
  const authToken = getEncodedCredentials();

  const response = await fetch(
    `${DOTS_API_URL}/users/${dotsUserId}/send-verification-token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        use_voice: true,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to send verification token: ${data}`);
  }

  console.log("sendVerificationToken", data);

  return data;
};
