"use client";

import { ErrorCodes } from "@/lib/api/error-codes";
import useWorkspace from "@/lib/swr/use-workspace";
import { ModalProvider } from "@/ui/modals/modal-provider";
import { SessionProvider } from "next-auth/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModalProvider>{children}</ModalProvider>
      <InviteRedirect />
    </SessionProvider>
  );
}

function InviteRedirect() {
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
