"use client";

import { createPartnerCommentAction } from "@/lib/actions/partners/create-partner-comment";
import { deletePartnerCommentAction } from "@/lib/actions/partners/delete-partner-comment";
import { updatePartnerCommentAction } from "@/lib/actions/partners/update-partner-comment";
import { mutatePrefix } from "@/lib/swr/mutate";
import { usePartnerComments } from "@/lib/swr/use-partner-comments";
import useUser from "@/lib/swr/use-user";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerCommentProps } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { MessageInput } from "@/ui/shared/message-input";
import {
  AnimatedSizeContainer,
  Button,
  LoadingSpinner,
  PenWriting,
  Popover,
  Trash,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDate } from "@dub/utils";
import Linkify from "linkify-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { v4 as uuid } from "uuid";

export function PartnerComments({ partnerId }: { partnerId: string }) {
  const { user } = useUser();
  const { id: workspaceId, defaultProgramId: programId } = useWorkspace();
  const { comments, loading, mutate } = usePartnerComments(
    { partnerId },
    { keepPreviousData: true },
  );

  const { executeAsync: createPartnerComment } = useAction(
    createPartnerCommentAction,
  );

  return (
    <div className="mt-4">
      <MessageInput
        onSendMessage={(text) => {
          if (!user) return false;

          const createdAt = new Date();

          const optimisticComment: PartnerCommentProps & {
            delivered?: false;
          } = {
            id: `tmp_${uuid()}`,
            createdAt,
            updatedAt: createdAt,
            programId: programId!,
            partnerId,
            userId: user.id,
            user: {
              id: user.id,
              name: user.name,
              image: user.image || null,
            },
            text,
            delivered: false,
          };

          mutate(
            async (data) => {
              const result = await createPartnerComment({
                workspaceId: workspaceId!,
                partnerId,
                text,
                createdAt,
              });

              if (!result?.data?.comment)
                throw new Error(
                  result?.serverError || "Failed to post comment",
                );

              return data
                ? [result.data.comment, ...data]
                : [result.data.comment];
            },
            {
              optimisticData: (data) =>
                data ? [optimisticComment, ...data] : [optimisticComment],
              rollbackOnError: true,
            },
          )
            .then(() => mutatePrefix(`/api/partners/${partnerId}/comments`))
            .catch((e) => {
              console.log("Failed to post comment", e);
              toast.error("Failed to post comment");
            });
        }}
        placeholder="Leave a comment"
        sendButtonText="Post"
        className="shadow-sm"
      />
      <div className="mt-1.5 flex justify-end pr-1.5 text-xs text-neutral-500">
        Comments are only visible to your workspace
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {comments ? (
          comments.length > 0 ? (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                partnerId={partnerId}
                comment={comment}
                mutate={mutate}
              />
            ))
          ) : null
        ) : loading ? (
          <CommentCard partnerId={partnerId} className="opacity-50" />
        ) : (
          <div className="text-content-muted py-4 text-center text-xs">
            Failed to load comments
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  partnerId,
  comment,
  mutate,
  className,
}: {
  partnerId: string;
  comment?: PartnerCommentProps & { delivered?: false };
  mutate?: KeyedMutator<(PartnerCommentProps & { delivered?: false })[]>;
  className?: string;
}) {
  const { user } = useUser();
  const { id: workspaceId } = useWorkspace();

  const [isEditing, setIsEditing] = useState(false);

  const { executeAsync: updateComment, isExecuting: isUpdating } = useAction(
    updatePartnerCommentAction,
    {
      onSuccess: () => {
        toast.success("Comment edited successfully");
        mutatePrefix(`/api/partners/${partnerId}/comments`);
      },
    },
  );

  const { executeAsync: deleteComment, isExecuting: isDeleting } = useAction(
    deletePartnerCommentAction,
    {
      onSuccess: () => {
        toast.success("Comment deleted successfully");
        mutatePrefix(`/api/partners/${partnerId}/comments`);
      },
      onError: ({ error }) => {
        toast.error(error.serverError || `Failed to delete comment`);
      },
    },
  );

  const [openPopover, setOpenPopover] = useState(false);

  const timestamp = comment ? new Date(comment.createdAt) : undefined;

  return (
    <div
      className={cn(
        "border-border-subtle rounded-xl border pb-4 pl-4 pr-3.5 pt-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {comment ? (
            <img
              src={comment.user.image || `${OG_AVATAR_URL}${comment.user.name}`}
              alt={`${comment.user.name} avatar`}
              className="size-4 shrink-0 rounded-full"
            />
          ) : (
            <div className="size-4 animate-pulse rounded-full bg-neutral-200" />
          )}
          {comment ? (
            <>
              <span className="text-content-emphasis text-xs font-semibold">
                {comment.user.name}
              </span>
              <div className="bg-content-muted size-0.5 shrink-0 rounded-full" />
              <span className="text-content-subtle text-xs">
                {new Date().getTime() - timestamp!.getTime() <
                1000 * 60 * 60 * 24
                  ? timestamp!.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                    })
                  : formatDate(timestamp!, {
                      month: "short",
                      year:
                        timestamp!.getFullYear() !== new Date().getFullYear()
                          ? "numeric"
                          : undefined,
                    })}
              </span>
              {comment.delivered === false && (
                <LoadingSpinner className="size-2.5" />
              )}
            </>
          ) : (
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
          )}
        </div>
        {comment && !isEditing && comment.userId === user?.id ? (
          <Popover
            content={
              <div className="grid w-full grid-cols-1 gap-px p-2 sm:w-48">
                <Button
                  text="Edit comment"
                  variant="outline"
                  loading={isUpdating}
                  disabled={comment.delivered === false}
                  onClick={async () => {
                    setOpenPopover(false);
                    setIsEditing(true);
                  }}
                  icon={<PenWriting className="size-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />
                <Button
                  text="Delete comment"
                  variant="danger-outline"
                  onClick={async () => {
                    setOpenPopover(false);

                    if (
                      !confirm("Are you sure you want to delete this comment?")
                    )
                      return;

                    await deleteComment({
                      workspaceId: workspaceId!,
                      commentId: comment.id,
                    });
                  }}
                  loading={isDeleting}
                  disabled={comment.delivered === false}
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "size-7 p-0",
                "data-[state=open]:border-border-emphasis sm:group-hover/card:data-[state=closed]:border-border-subtle border-transparent",
              )}
              icon={
                isDeleting ? (
                  <LoadingSpinner className="size-4 shrink-0" />
                ) : (
                  <ThreeDots className="size-4 shrink-0" />
                )
              }
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        ) : (
          <div className="size-7" />
        )}
      </div>

      <div className="mt-2">
        {comment ? (
          <AnimatedSizeContainer
            height
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="-m-0.5 overflow-clip"
          >
            <div className="p-0.5">
              {isEditing ? (
                <MessageInput
                  defaultValue={comment.text}
                  onCancel={() => setIsEditing(false)}
                  onSendMessage={(text) => {
                    if (!user) return false;

                    setIsEditing(false);

                    mutate?.(
                      async (data) => {
                        const result = await updateComment({
                          workspaceId: workspaceId!,
                          id: comment.id,
                          text,
                        });

                        if (!result?.data?.comment)
                          throw new Error(
                            result?.serverError || "Failed to update comment",
                          );

                        if (!data) return [];
                        const idx = data.findIndex(
                          (c) => c.id === result.data?.comment.id,
                        );
                        if (idx === -1) return data;

                        return data
                          ? data.toSpliced(idx, 1, result.data.comment)
                          : [];
                      },
                      {
                        optimisticData: (data) => {
                          if (!data) return [];
                          const idx = data.findIndex(
                            (c) => c.id === comment.id,
                          );
                          if (idx === -1) return data;

                          return data.toSpliced(idx, 1, {
                            ...data[idx],
                            text,
                            delivered: false,
                          });
                        },
                        rollbackOnError: true,
                      },
                    )
                      .then(() =>
                        mutatePrefix(`/api/partners/${partnerId}/comments`),
                      )
                      .catch((e) => {
                        console.log("Failed to update comment", e);
                        toast.error("Failed to update comment");
                      });
                  }}
                  autoFocus
                  className="animate-fade-in"
                  placeholder="Edit comment"
                  sendButtonText="Save"
                />
              ) : (
                <Linkify
                  as="p"
                  className="text-content-subtle whitespace-pre-wrap text-sm font-medium"
                  options={{
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                    className:
                      "underline underline-offset-4 hover:text-content-default",
                  }}
                >
                  {comment?.text}
                </Linkify>
              )}
            </div>
          </AnimatedSizeContainer>
        ) : (
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
