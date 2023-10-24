import jackson from "@/lib/jackson";
import { NextResponse } from "next/server";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse,
// ) {
//   const { oauthController } = await jackson();

//   const authHeader = req.headers["authorization"];

//   if (!authHeader) {
//     throw new Error("Unauthorized");
//   }

//   const token = authHeader.split(" ")[1];

//   const user = await oauthController.userInfo(token);

//   return res.json(user);
// }

export async function GET(req: Request) {
  const { oauthController } = await jackson();

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  const user = await oauthController.userInfo(token);

  return NextResponse.json(user);
}
