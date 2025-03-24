import * as jose from "jose";
import { NextResponse } from "next/server";
import * as openidClient from "openid-client";

export const GET = () => {
  return NextResponse.json({
    jose,
    openidClient,
  });
};
