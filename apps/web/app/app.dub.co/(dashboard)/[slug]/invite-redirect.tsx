"use client";

import { ErrorCodes } from "@/lib/api/error-codes";
import useWorkspace from "@/lib/swr/use-workspace";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function InviteRedirect() {
  let { slug } = useParams() as { slug: string | null };
  const pathname = usePathname();
  const router = useRouter();

  const { error } = useWorkspace();

  useEffect(() => {
    if (
      slug &&
      pathname !== `/${slug}/invite` &&
      error &&
      [ErrorCodes.invite_pending, ErrorCodes.invite_expired].includes(
        error.status,
      )
    )
      router.replace(`/${slug}/invite`);
  }, [slug, pathname, error]);

  return null;
}
