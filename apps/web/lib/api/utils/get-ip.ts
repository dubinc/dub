import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";

const FALLBACK_IP_ADDRESS = "0.0.0.0";

type IPSource = "x-real-ip" | "fallback";

export const getIPWithSource = async (): Promise<{
  ip: string;
  source: IPSource;
}> => {
  const trusted = ipAddress({ headers: await headers() })?.trim();

  if (trusted) {
    return {
      ip: trusted,
      source: "x-real-ip",
    };
  }

  return {
    ip: FALLBACK_IP_ADDRESS,
    source: "fallback",
  };
};

export const getIP = async () => {
  const { ip } = await getIPWithSource();

  return ip;
};
