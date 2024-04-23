import { NextRequest } from "next/server";

export const getFinalUrl = (url: string, { req }: { req: NextRequest }) => {
  return url;
};
