import { geolocation } from "@vercel/functions";
import { NextRequest } from "next/server";

export async function getUserCountry(req: NextRequest) {
  const { country } = geolocation(req);

  return country;
}
