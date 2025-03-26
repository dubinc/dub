import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress } from "@vercel/functions";

export const getIpAddress = (req: Request) => {
  return process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
};
