import { useRouter } from "next/router";
import { useMemo } from "react";
import useSWR from "swr";
import { LinkProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function useLink() {
  const router = useRouter();

  const { key } = router.query as {
    key: string;
  };

  const { data: session } = useSession();

  const { data: link } = useSWR<LinkProps>(
    key && `/api/edge/links/${key}`,
    fetcher,
    {
      dedupingInterval: 10000,
    },
  );

  const isOwner = useMemo(() => {
    if (!session || !link) return false;
    // @ts-ignore - TODO: fix this
    return session.user.id === link.userId;
  }, [session, link]);

  return {
    link,
    isOwner,
  };
}
