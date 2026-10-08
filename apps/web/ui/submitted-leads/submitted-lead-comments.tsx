"use client";

import { createSubmittedLeadCommentAction } from "@/lib/submitted-leads/create-submitted-lead-comment-action";
import { deleteSubmittedLeadCommentAction } from "@/lib/submitted-leads/delete-submitted-lead-comment-action";
import { updateSubmittedLeadCommentAction } from "@/lib/submitted-leads/update-submitted-lead-comment-action";
import { useSubmittedLeadComments } from "@/lib/swr/use-submitted-lead-comments";
import useUser from "@/lib/swr/use-user";
import useWorkspace from "@/lib/swr/use-workspace";
import { SubmittedLeadCommentProps } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { MessageInput } from "@/ui/shared/message-input";
import {
  AnimatedSizeContainer,
  Button,
  Check2,
  Eye,
  LoadingSpinner,
  PROSE_STYLES,
  PenWriting,
  Popover,
  Trash,
} from "@dub/ui";
import { OG_AVATAR_URL, cn, timeAgo } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { KeyedMutator } from "swr";
import { v4 as uuid } from "uuid";

export type CommentWithDelivery = SubmittedLeadCommentProps & {
  delivered?: false;
};

// Sizes from the Figma design for the comment input
export const COMMENT_INPUT_CLASSNAME =
  "mx-1 mt-1 rounded-[10px] border border-transparent transition-colors [&>[aria-hidden]]:rounded-[9px] [&_.ProseMirror]:min-h-16";
export const COMMENT_TOOLBAR_CLASSNAME = "p-2";

// Comment inputs do not show the focus ring that message inputs use
export const COMMENT_CONTAINER_CLASSNAME =
  "focus-within:border-border-subtle focus-within:ring-0";

const VISIBILITY_OPTIONS = [
  { partnerVisible: false, label: "Workspace only" },
  { partnerVisible: true, label: "Workspace and partner" },
] as const;

export function SubmittedLeadComments({ leadId }: { leadId: string }) {
  const { user } = useUser();
  const { id: workspaceId } = useWorkspace();
  const { comments, loading, mutate } = useSubmittedLeadComments(
    { leadId },
    { keepPreviousData: true },
  );

  const [partnerVisible, setPartnerVisible] = useState(false);

  const { executeAsync: createComment } = useAction(
    createSubmittedLeadCommentAction,
  );

  return (
    <div className="flex flex-col gap-4">
      <MessageInput
        onSendMessage={(text) => {
          if (!user) return false;

          const createdAt = new Date();

          const optimisticComment: CommentWithDelivery = {
            id: `tmp_${uuid()}`,
            leadId,
            userId: user.id,
            partnerId: null,
            text,
            partnerVisible,
            createdAt,
            updatedAt: createdAt,
            user: {
              id: user.id,
              name: user.name,
              image: user.image || null,
            },
            delivered: false,
          };

          mutate(
            async (data) => {
              const result = await createComment({
                workspaceId: workspaceId!,
                leadId,
                text,
                partnerVisible,
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
              revalidate: true,
            },
          ).catch((e) => {
            console.log("Failed to post comment", e);
            toast.error("Failed to post comment");
          });
        }}
        placeholder={
          partnerVisible
            ? "Leave a comment for your workspace and partner"
            : "Leave a comment for your workspace"
        }
        sendButtonText="Post"
        className={COMMENT_CONTAINER_CLASSNAME}
        inputClassName={cn(
          COMMENT_INPUT_CLASSNAME,
          partnerVisible &&
            "border-orange-200 bg-orange-50 [&>[aria-hidden]]:from-orange-50 [&_.is-empty]:before:text-amber-950/50",
        )}
        toolbarClassName={COMMENT_TOOLBAR_CLASSNAME}
        actions={
          <VisibilitySelector
            partnerVisible={partnerVisible}
            setPartnerVisible={setPartnerVisible}
          />
        }
      />

      {comments ? (
        comments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} mutate={mutate} />
            ))}
          </div>
        ) : null
      ) : loading ? (
        <CommentCard className="opacity-50" />
      ) : (
        <div className="text-content-muted py-4 text-center text-xs">
          Failed to load comments
        </div>
      )}
    </div>
  );
}

function VisibilitySelector({
  partnerVisible,
  setPartnerVisible,
}: {
  partnerVisible: boolean;
  setPartnerVisible: (partnerVisible: boolean) => void;
}) {
  const [openPopover, setOpenPopover] = useState(false);

  const selected = VISIBILITY_OPTIONS.find(
    (option) => option.partnerVisible === partnerVisible,
  )!;

  return (
    <Popover
      content={
        <div className="grid w-full grid-cols-1 gap-px p-1 sm:w-56">
          {VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setPartnerVisible(option.partnerVisible);
                setOpenPopover(false);
              }}
              className="text-content-default hover:bg-bg-muted flex h-8 items-center justify-between gap-2 rounded-md px-2 text-sm"
            >
              {option.label}
              {option.partnerVisible === partnerVisible && (
                <Check2 className="size-3.5 shrink-0" />
              )}
            </button>
          ))}
        </div>
      }
      align="end"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        className="text-content-emphasis hover:bg-bg-muted data-[state=open]:bg-bg-muted flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors"
      >
        <Eye className="size-3.5 shrink-0" />
        <span className="whitespace-nowrap">{selected.label}</span>
        <ChevronDown className="text-content-subtle size-2.5 shrink-0" />
      </button>
    </Popover>
  );
}

// Pass `program` to render the card for the partner who submitted the lead
export function CommentCard({
  comment,
  mutate,
  program,
  className,
}: {
  comment?: CommentWithDelivery;
  mutate?: KeyedMutator<CommentWithDelivery[]>;
  program?: { id: string; name: string; logo: string | null };
  className?: string;
}) {
  const { user } = useUser();
  const { id: workspaceId } = useWorkspace();

  const [isEditing, setIsEditing] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);

  // Keeps the edited text so the editor can open again with it if the update fails
  const [editDraft, setEditDraft] = useState<string | null>(null);

  const { executeAsync: updateComment, isExecuting: isUpdating } = useAction(
    updateSubmittedLeadCommentAction,
  );

  const { executeAsync: deleteComment, isExecuting: isDeleting } = useAction(
    deleteSubmittedLeadCommentAction,
    {
      onSuccess: () => {
        toast.success("Comment deleted successfully");
        mutate?.();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to delete comment");
      },
    },
  );

  const isPartnerView = Boolean(program);
  const isFromPartner = Boolean(comment?.partnerId);
  const isPartnerVisible =
    !isPartnerView && Boolean(comment?.partnerVisible) && !isFromPartner;
  const canEdit =
    comment &&
    !isPartnerView &&
    !isEditing &&
    !isFromPartner &&
    comment.userId === user?.id;

  return (
    <div
      className={cn(
        "rounded-xl border pb-4 pl-4 pr-3.5 pt-2.5 shadow-sm",
        isPartnerVisible
          ? "border-orange-200 bg-orange-50"
          : "border-border-subtle",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          {comment ? (
            <>
              <img
                src={
                  comment.user.image || `${OG_AVATAR_URL}${comment.user.name}`
                }
                alt={`${comment.user.name} avatar`}
                className="size-4 shrink-0 rounded-full"
              />
              <span className="text-content-emphasis truncate text-xs font-semibold">
                {comment.user.name}
              </span>
              {program && !isFromPartner && (
                <span className="bg-bg-subtle text-content-default flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium">
                  <img
                    src={program.logo || `${OG_AVATAR_URL}${program.id}`}
                    alt={`${program.name} logo`}
                    className="size-3 shrink-0 rounded-full"
                  />
                  {program.name}
                </span>
              )}
              {!isPartnerView && isFromPartner && (
                <span className="bg-bg-subtle text-content-default rounded-md px-1.5 py-0.5 text-xs font-medium">
                  Partner
                </span>
              )}
              {isPartnerVisible && (
                <span className="flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800">
                  <Eye className="size-3 shrink-0" />
                  Partner visible
                </span>
              )}
              <div className="bg-content-muted size-0.5 shrink-0 rounded-full" />
              <span className="text-content-subtle whitespace-nowrap text-xs">
                {timeAgo(new Date(comment.createdAt), { withAgo: true })}
              </span>
              {comment.delivered === false && (
                <LoadingSpinner className="size-2.5" />
              )}
            </>
          ) : (
            <>
              <div className="size-4 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
            </>
          )}
        </div>
        {canEdit ? (
          <Popover
            content={
              <div className="grid w-full grid-cols-1 gap-px p-2 sm:w-48">
                <Button
                  text="Edit comment"
                  variant="outline"
                  loading={isUpdating}
                  disabled={comment.delivered === false}
                  onClick={() => {
                    setOpenPopover(false);
                    setEditDraft(null);
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
              className="data-[state=open]:border-border-emphasis size-7 border-transparent bg-transparent p-0"
              icon={
                isDeleting ? (
                  <LoadingSpinner className="size-4 shrink-0" />
                ) : (
                  <ThreeDots className="size-4 shrink-0" />
                )
              }
              onClick={() => setOpenPopover(!openPopover)}
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
                  defaultValue={editDraft ?? comment.text}
                  onCancel={() => setIsEditing(false)}
                  onSendMessage={(text) => {
                    if (!user) return false;

                    setEditDraft(text);
                    setIsEditing(false);

                    mutate?.(
                      async (data) => {
                        const result = await updateComment({
                          workspaceId: workspaceId!,
                          commentId: comment.id,
                          text,
                        });

                        if (!result?.data?.comment)
                          throw new Error(
                            result?.serverError || "Failed to update comment",
                          );

                        const updated = result.data.comment;
                        return data?.map((c) =>
                          c.id === updated.id ? updated : c,
                        );
                      },
                      {
                        optimisticData: (data) =>
                          data?.map((c) =>
                            c.id === comment.id
                              ? { ...c, text, delivered: false as const }
                              : c,
                          ) ?? [],
                        rollbackOnError: true,
                        revalidate: true,
                      },
                    ).catch((e) => {
                      console.log("Failed to update comment", e);
                      toast.error("Failed to update comment");
                      setIsEditing(true);
                    });
                  }}
                  autoFocus
                  className={cn(
                    "animate-fade-in bg-white",
                    COMMENT_CONTAINER_CLASSNAME,
                  )}
                  placeholder="Edit comment"
                  sendButtonText="Save"
                />
              ) : (
                <ReactMarkdown
                  className={cn(
                    "prose prose-sm text-content-default break-words font-normal",
                    PROSE_STYLES.condensed,
                    "prose-a:font-medium prose-a:underline-offset-4",
                  )}
                  allowedElements={[
                    "p",
                    "a",
                    "code",
                    "strong",
                    "em",
                    "ul",
                    "ol",
                    "li",
                  ]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      />
                    ),
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {comment.text}
                </ReactMarkdown>
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
