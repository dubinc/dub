import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
    image?: string;
  };
}

export const getSession = async () => {
  return getServerSession(authOptions) as Promise<Session>;
};

export const hashToken = async (
  token: string,
  {
    secret = false,
  }: {
    secret?: boolean;
  } = {},
) => {
  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${token}${secret ? process.env.NEXTAUTH_SECRET : ""}`,
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
