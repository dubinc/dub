"use client";

import { ErrorCodes } from "@/lib/api/error-codes";
import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound, redirect, useParams } from "next/navigation";
import { ReactNode } from "react";

export default function WorkspaceAuth({ children }: { children: ReactNode }) {
  const { slug } = useParams();
  const { loading, error } = useWorkspace();

  if (loading) {
    return <LayoutLoader />;
  }

  if (error) {
    if (error.status === ErrorCodes.not_found) {
      notFound();
    } else if (
      [ErrorCodes.invite_pending, ErrorCodes.invite_expired].includes(
        error.status,
      )
    ) {
      redirect(`/${slug}/invite`);
    }
  }

  return children;
}
