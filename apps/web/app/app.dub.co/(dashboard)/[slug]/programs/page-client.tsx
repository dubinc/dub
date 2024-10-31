"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramProps } from "@/lib/types";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { notFound, redirect } from "next/navigation";
import useSWR from "swr";

export function ProgramsPageClient() {
  const { id, slug } = useWorkspace();
  const { data: programs, isLoading } = useSWR<ProgramProps[]>(
    `/api/programs?workspaceId=${id}`,
    fetcher,
  );

  if (isLoading) {
    return null;
  }

  const firstProgramId = programs?.[0]?.id;

  if (!firstProgramId) {
    notFound();
  }

  redirect(`/${slug}/programs/${firstProgramId}`);
}
