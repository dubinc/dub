import { NextResponse } from "next/server";

export const POST = async (req: Request, res: Response) => {
  // TODO:
  // Find user and return the email

  return NextResponse.json({
    username: "kiran@dub.co",
  });
};
