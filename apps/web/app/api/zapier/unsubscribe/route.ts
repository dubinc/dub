import { NextResponse } from "next/server";

export const DELETE = async (req: Request, res: Response) => {
  const user = {
    username: "Kiran",
  };

  return NextResponse.json(user);
};
