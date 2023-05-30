import NextAuth from "@auth/nextjs";
import authConfig from "auth.config";
export const { GET, POST } = NextAuth(authConfig).handlers;
export const runtime = "edge";
