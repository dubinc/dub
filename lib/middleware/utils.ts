import { NextRequest } from "next/server";
import { RESERVED_KEYS } from "@/lib/constants";

export const parse = (req: NextRequest) => {
  let hostname = req.headers.get("host");
  if (hostname === "localhost:3000") hostname = "dub.sh";
  const path = req.nextUrl.pathname;
  const key = path.split("/")[1];
  return { hostname, path, key };
};
