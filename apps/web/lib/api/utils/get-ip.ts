import { headers } from "next/headers";

export const FALLBACK_IP_ADDRESS = "0.0.0.0";

export type IPSource = "x-forwarded-for" | "x-real-ip" | "fallback";

export const getIPWithSource = async (): Promise<{
  ip: string;
  source: IPSource;
}> => {
  const forwardedFor = (await headers()).get("x-forwarded-for");

  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) {
      return { ip, source: "x-forwarded-for" };
    }
  }

  const realIp = (await headers()).get("x-real-ip")?.trim();
  if (realIp) {
    return { ip: realIp, source: "x-real-ip" };
  }

  return { ip: FALLBACK_IP_ADDRESS, source: "fallback" };
};

export const getIP = async () => {
  return (await getIPWithSource()).ip;
};
