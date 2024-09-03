import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

console.log({DYNADOT_API_KEY, DYNADOT_BASE_URL})

export const searchDomains = async (keyword: string) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    command: "search",
    domain0: keyword,
    domain1: keyword,
    show_price: "1",
    currency: "USD",
  });

  const response = await fetch(
    `${DYNADOT_BASE_URL}?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to search domains: ${response.statusText}`);
  }

  return await response.json();
};
