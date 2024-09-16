import { DYNADOT_API_KEY, DYNADOT_BASE_URL } from "./constants";

export const configureDNS = async ({ domain }: { domain: string }) => {
  const searchParams = new URLSearchParams({
    key: DYNADOT_API_KEY,
    domain: domain,
    command: "set_dns2",
    main_record_type0: "a",
    main_record0: "76.76.21.21",
  });

  return fetch(`${DYNADOT_BASE_URL}?${searchParams.toString()}`, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).then((res) => res.json());
};
