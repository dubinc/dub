import { NextRequest } from "next/server";
import { userUpdated } from "./user-updated";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { event } = body;

  let response = "OK";
  switch (event) {
    case "user.updated":
      response = await userUpdated(body);
      break;
  }

  console.log(body);

  return new Response(response);
}
