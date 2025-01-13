import { DUB_API_HOST } from "./constants";
import { getValidToken } from "./oauth";
import { stripe } from "./stripe";

export async function createLink({
  url,
  isPublic,
}: {
  url: string;
  isPublic: boolean;
}) {
  const token = isPublic ? null : await getValidToken({ stripe });

  const response = await fetch(`${DUB_API_HOST}/links`, {
    method: "POST",
    body: JSON.stringify({
      url,
    }),
    headers: {
      "Content-Type": "application/json",
      ...(!token
        ? { "dub-anonymous-link-creation": "1" }
        : { Authorization: `Bearer ${token.access_token}` }),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error("Failed to create link.", {
      cause: data.error,
    });
  }

  return data;
}
