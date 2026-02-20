"use client";

import { PostbackProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useAddEditPostbackModal } from "@/ui/postbacks/add-edit-postback-modal";
import { PostbackCard } from "@/ui/postbacks/postback-card";
import { PostbackPlaceholder } from "@/ui/postbacks/postback-placeholder";
import { usePostbackSecretModal } from "@/ui/postbacks/postback-secret-modal";
import EmptyState from "@/ui/shared/empty-state";
import { EmptyState as EmptyStateBlock } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { AlertCircle, Webhook } from "lucide-react";
import useSWR from "swr";
import { AddPostbackButton } from "./add-postback-button";

export function PostbacksPageClient() {
  const {
    data: postbacks,
    error,
    isLoading,
    mutate,
  } = useSWR<PostbackProps[]>("/api/partner-profile/postbacks", fetcher, {
    keepPreviousData: true,
  });

  const { openPostbackSecretModal, PostbackSecretModal } =
    usePostbackSecretModal();

  const { openAddPostbackModal, AddEditPostbackModal } =
    useAddEditPostbackModal(() => mutate(), openPostbackSecretModal);

  return (
    <>
      <PageContent
        title="Postbacks"
        titleInfo={{
          title:
            "Receive HTTP requests when events like leads, sales, or commissions occur in your partner programs.",
          href: "https://d.to/postbacks",
        }}
        controls={<AddPostbackButton onClick={openAddPostbackModal} />}
      >
        <PageWidthWrapper>
          <div className="grid gap-5">
            <div className="animate-fade-in">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <PostbackPlaceholder key={idx} />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 py-10">
                  <EmptyStateBlock
                    icon={AlertCircle}
                    title="Failed to load postbacks"
                    description={
                      error instanceof Error
                        ? error.message
                        : "Something went wrong. Please try again."
                    }
                  >
                    <button
                      type="button"
                      onClick={() => mutate()}
                      className="flex h-8 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      Try again
                    </button>
                  </EmptyStateBlock>
                </div>
              ) : postbacks && postbacks.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {postbacks.map((postback) => (
                    <PostbackCard key={postback.id} {...postback} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 py-10">
                  <EmptyState
                    icon={Webhook}
                    title="You haven't set up any postbacks yet."
                    description="Postbacks allow you to receive HTTP requests when events like leads, sales, or commissions occur in your partner programs."
                    learnMore="https://d.to/postbacks"
                  />
                </div>
              )}
            </div>
          </div>
        </PageWidthWrapper>
      </PageContent>
      {AddEditPostbackModal}
      {PostbackSecretModal}
    </>
  );
}
