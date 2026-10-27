import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function useRefreshSession(sessionUserAttribute: string) {
  const { data: session, update, status } = useSession();

  useEffect(() => {
    const refreshSession = async () => {
      if (session?.user && !session.user[sessionUserAttribute]) {
        console.log(`no ${sessionUserAttribute}, refreshing`);
        await update();
      }
    };
    refreshSession();
  }, [session]);

  return {
    session,
    update,
    loading: status === "loading",
  };
}
