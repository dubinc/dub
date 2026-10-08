import { useCallback, useRef, useState } from "react";
import * as z from "zod/v4";
import { mutatePrefix } from "../../swr/mutate";
import useWorkspace from "../../swr/use-workspace";
import { PartnerTagProps } from "../../types";
import {
  createPartnerTagSchema,
  updatePartnerTagSchema,
} from "../../zod/schemas/partner-tags";

async function requestPartnerTag<T>({
  url,
  method,
  body,
}: {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
}) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "Something went wrong");
  }

  return data as T;
}

async function revalidatePartnersAfterPartnerTagChange() {
  await mutatePrefix("/api/partners");
  await mutatePrefix("/api/partner-tags");
  await mutatePrefix("/api/partners/count");
}

function usePartnerTagMutation<TInput, TResult>(
  mutatePartnerTag: (
    input: TInput & { workspaceId: string },
  ) => Promise<TResult>,
) {
  const { id: workspaceId } = useWorkspace();
  const [isPending, setIsPending] = useState(false);
  const isPendingRef = useRef(false);

  const execute = useCallback(
    async (input: TInput) => {
      if (!workspaceId || isPendingRef.current) return;

      isPendingRef.current = true;
      setIsPending(true);

      try {
        return await mutatePartnerTag({
          ...input,
          workspaceId,
        });
      } finally {
        isPendingRef.current = false;
        setIsPending(false);
      }
    },
    [mutatePartnerTag, workspaceId],
  );

  return { execute, isPending };
}

export function useMutatePartnerTag() {
  const createPartnerTag = useCallback(
    async ({
      name,
      workspaceId,
    }: z.infer<typeof createPartnerTagSchema> & { workspaceId: string }) => {
      const partnerTag = await requestPartnerTag<PartnerTagProps>({
        url: `/api/partner-tags?workspaceId=${workspaceId}`,
        method: "POST",
        body: { name },
      });

      await mutatePrefix("/api/partner-tags");

      return partnerTag;
    },
    [],
  );

  const updatePartnerTag = useCallback(
    async ({
      partnerTagId,
      name,
      workspaceId,
    }: z.infer<typeof updatePartnerTagSchema> & { workspaceId: string }) => {
      const partnerTag = await requestPartnerTag<PartnerTagProps>({
        url: `/api/partner-tags/${partnerTagId}?workspaceId=${workspaceId}`,
        method: "PATCH",
        body: { name },
      });

      await revalidatePartnersAfterPartnerTagChange();

      return partnerTag;
    },
    [],
  );

  const deletePartnerTag = useCallback(
    async ({
      partnerTagId,
      workspaceId,
    }: Pick<z.infer<typeof updatePartnerTagSchema>, "partnerTagId"> & {
      workspaceId: string;
    }) => {
      const deleted = await requestPartnerTag<Pick<PartnerTagProps, "id">>({
        url: `/api/partner-tags/${partnerTagId}?workspaceId=${workspaceId}`,
        method: "DELETE",
      });

      await revalidatePartnersAfterPartnerTagChange();

      return deleted;
    },
    [],
  );

  const create = usePartnerTagMutation(createPartnerTag);
  const update = usePartnerTagMutation(updatePartnerTag);
  const deleteTag = usePartnerTagMutation(deletePartnerTag);

  return {
    create: {
      mutate: create.execute,
      isPending: create.isPending,
    },
    update: {
      mutate: update.execute,
      isPending: update.isPending,
    },
    delete: {
      mutate: deleteTag.execute,
      isPending: deleteTag.isPending,
    },
  };
}
