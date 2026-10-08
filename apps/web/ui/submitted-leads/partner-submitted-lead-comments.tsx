"use client";

import { createPartnerSubmittedLeadCommentAction } from "@/lib/submitted-leads/create-partner-submitted-lead-comment-action";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { usePartnerSubmittedLeadComments } from "@/lib/swr/use-partner-submitted-lead-comments";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import useUser from "@/lib/swr/use-user";
import { MessageInput } from "@/ui/shared/message-input";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import {
  COMMENT_CONTAINER_CLASSNAME,
  COMMENT_INPUT_CLASSNAME,
  COMMENT_TOOLBAR_CLASSNAME,
  CommentCard,
  CommentWithDelivery,
} from "./submitted-lead-comments";

export function PartnerSubmittedLeadComments({ leadId }: { leadId: string }) {
  const { user } = useUser();
  const { partner } = usePartnerProfile();
  const { programEnrollment } = useProgramEnrollment();
  const program = programEnrollment?.program;

  const { comments, loading, mutate } = usePartnerSubmittedLeadComments(
    { leadId },
    { keepPreviousData: true },
  );

  const { executeAsync: createComment } = useAction(
    createPartnerSubmittedLeadCommentAction,
  );

  return (
    <div className="flex flex-col gap-4">
      <MessageInput
        onSendMessage={(text) => {
          if (!user || !partner || !program) return false;

          const createdAt = new Date();

          const optimisticComment: CommentWithDelivery = {
            id: `tmp_${uuid()}`,
            leadId,
            userId: user.id,
            partnerId: partner.id,
            text,
            partnerVisible: true,
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
                programId: program.id,
                leadId,
                text,
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
        placeholder="Leave a comment for this program"
        sendButtonText="Post"
        className={COMMENT_CONTAINER_CLASSNAME}
        inputClassName={COMMENT_INPUT_CLASSNAME}
        toolbarClassName={COMMENT_TOOLBAR_CLASSNAME}
      />

      {comments && program ? (
        comments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                program={program}
              />
            ))}
          </div>
        ) : null
      ) : loading || !program ? (
        <CommentCard className="opacity-50" />
      ) : (
        <div className="text-content-muted py-4 text-center text-xs">
          Failed to load comments
        </div>
      )}
    </div>
  );
}
