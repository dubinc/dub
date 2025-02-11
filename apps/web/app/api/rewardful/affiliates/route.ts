import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "d0ed8392-8880-4f39-8715-60230f9eceab",
      created_at: "2019-05-09T16:18:59.920Z",
      updated_at: "2019-05-09T16:25:42.614Z",
      first_name: "Adam",
      last_name: "Jones",
      email: "adam.jones@example.com",
      state: "active",
      visitors: 100,
      leads: 42,
      conversions: 18,
    },
  ]);
}
