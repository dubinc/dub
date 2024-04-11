import { NextRequest } from "next/server";

export const detectQr = (req: NextRequest) => {
  const url = req.nextUrl;
  if (url.searchParams.get("qr") === "1") return true;
  return false;
};
