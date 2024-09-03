import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

export const registerDomain = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain: domain,
    command: "register",
    duration: "12", // TODO: Is this month or year?
    currency: "USD",
  });

  const response = await fetch(
    `${DYNADOT_BASE_URL}?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to register domain: ${response.statusText}`);
  }

  return await response.json();
};
