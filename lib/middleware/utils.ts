import { NextRequest } from "next/server";
import { HOME_HOSTNAMES } from "@/lib/constants";

export const parse = (req: NextRequest) => {
  let hostname = req.headers.get("host");
  if (HOME_HOSTNAMES.includes(hostname)) hostname = "dub.sh";
  const path = req.nextUrl.pathname;
  const key = path.split("/")[1];
  return { hostname, path, key };
};
