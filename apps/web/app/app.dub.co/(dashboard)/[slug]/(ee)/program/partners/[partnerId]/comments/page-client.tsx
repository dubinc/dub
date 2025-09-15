"use client";

import { createPartnerCommentAction } from "@/lib/actions/partners/create-partner-comment";
import { deletePartnerCommentAction } from "@/lib/actions/partners/delete-partner-comment";
import { mutatePrefix } from "@/lib/swr/mutate";
import { usePartnerComments } from "@/lib/swr/use-partner-comments";
import useUser from "@/lib/swr/use-user";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramPartnerCommentProps } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { MessageInput } from "@/ui/shared/message-input";
import { Button, LoadingSpinner, Popover, Trash } from "@dub/ui";
import { OG_AVATAR_URL, cn, formatDate } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export function ProgramPartnerCommentsPageClient() {
  const { partnerId } = useParams() as { partnerId: string };
  const { user } = useUser();
  const { id: workspaceId } = useWorkspace();
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

          const optimisticComment: ProgramPartnerCommentProps & {
            delivered?: false;
          } = {
            id: `tmp_${uuid()}`,
            createdAt,
            updatedAt: createdAt,
            programEnrollmentId: "pge_d21G4zVfQuuLElDdTHL7BNLA", // TODO
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
            .then(() => `/api/partners/${partnerId}/comments`)
            .catch((e) => {
              console.log("Failed to post comment", e);
              toast.error("Failed to post comment");
            });
        }}
        placeholder="Leave a comment"
        sendButtonText="Post"
        className="shadow-sm"
      />

      <div className="mt-4 flex flex-col gap-4">
        {comments ? (
          comments?.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        ) : loading ? (
          <CommentCard className="opacity-50" />
        ) : (
          <div className="text-content-subtle py-12 text-center text-sm">
            Failed to load comments
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  className,
}: {
  comment?: ProgramPartnerCommentProps & { delivered?: false };
  className?: string;
}) {
  const { partnerId } = useParams() as { partnerId: string };
  const { id: workspaceId } = useWorkspace();

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
        {comment ? (
          <Popover
            content={
              <div className="grid w-full grid-cols-1 gap-px p-2 sm:w-48">
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
          <p className="text-content-subtle text-sm font-medium">
            {comment?.text}
          </p>
        ) : (
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
