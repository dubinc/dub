import { getServerSession } from "next-auth/next";
import { authOptions } from "./options";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
    image?: string;
    isMachine: boolean;
  };
}

export const getSession = async () => {
  return getServerSession(authOptions) as Promise<Session>;
};
