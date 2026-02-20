"use client";

import { PostbackEventProps, PostbackProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useAddEditPostbackModal } from "@/ui/postbacks/add-edit-postback-modal";
import { PostbackActions } from "@/ui/postbacks/partner-postback-actions";
import { PostbackDetailSkeleton } from "@/ui/postbacks/postback-detail-skeleton";
import { usePostbackEventDetailsSheet } from "@/ui/postbacks/postback-event-details-sheet";
import { PostbackEventList } from "@/ui/postbacks/postback-event-list";
import { PostbackEventListSkeleton } from "@/ui/postbacks/postback-event-list-skeleton";
import { usePostbackSecretModal } from "@/ui/postbacks/postback-secret-modal";
import { PostbackStatus } from "@/ui/postbacks/postback-status";
import { BackLink } from "@/ui/shared/back-link";
import { EmptyState, TokenAvatar, Webhook } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

interface PostbackDetailPageClientProps {
  postbackId: string;
}

export function PostbackDetailPageClient({
  postbackId,
}: PostbackDetailPageClientProps) {
  const router = useRouter();
  const [openPopover, setOpenPopover] = useState(false);

  const {
    data: postback,
    error,
    isLoading,
    mutate,
  } = useSWR<PostbackProps>(
    postbackId ? `/api/partner-profile/postbacks/${postbackId}` : null,
    fetcher,
  );

  const {
    data: events,
    error: eventsError,
    isLoading: isEventsLoading,
  } = useSWR<PostbackEventProps[]>(
    postbackId ? `/api/partner-profile/postbacks/${postbackId}/events` : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { postbackEventDetailsSheet, openWithEvent } =
    usePostbackEventDetailsSheet();

  const { openPostbackSecretModal, PostbackSecretModal } =
    usePostbackSecretModal();

  const { openEditPostbackModal, AddEditPostbackModal } =
    useAddEditPostbackModal(() => mutate(), openPostbackSecretModal);

  if (Boolean(error && (error as { status?: number }).status === 404)) {
    redirect("/profile/postbacks");
  }

  return (
    <>
      {AddEditPostbackModal}
      <PostbackSecretModal />
      {postbackEventDetailsSheet}
      <PageContent
        title="Postbacks"
        titleInfo={{
          title:
            "Receive HTTP requests when events like leads, sales, or commissions occur in your partner programs.",
          href: "https://dub.co/help",
        }}
      >
        <PageWidthWrapper className="grid max-w-screen-lg gap-8 pb-10">
          <BackLink href="/profile/postbacks">Back to postbacks</BackLink>
          {isLoading && !postback ? (
            <PostbackDetailSkeleton />
          ) : error || !postback ? (
            <div className="rounded-xl border border-neutral-200 py-10 text-center">
              <p className="text-sm text-red-600">
                {error instanceof Error ? error.message : "Postback not found"}
              </p>
              <button
                type="button"
                onClick={() => router.push("/profile/postbacks")}
                className="mt-2 text-sm font-medium text-neutral-700 underline"
              >
                Back to postbacks
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-8 sm:items-center">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-fit flex-none rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
                    <TokenAvatar id={postback.id} className="size-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-neutral-700">
                        {postback.name}
                      </span>
                      <PostbackStatus disabledAt={postback.disabledAt} />
                    </div>
                    <a
                      href={postback.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 text-pretty break-all text-sm text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline"
                    >
                      {postback.url}
                    </a>
                  </div>
                </div>

                <PostbackActions
                  postback={postback}
                  openPopover={openPopover}
                  setOpenPopover={setOpenPopover}
                  onEditPostback={openEditPostbackModal}
                  onMutate={() => mutate()}
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-medium">Events</h2>

                {isEventsLoading ? (
                  <PostbackEventListSkeleton />
                ) : eventsError ? (
                  <div className="rounded-xl border border-neutral-200 py-10 text-center">
                    <p className="text-sm text-red-600">
                      {eventsError instanceof Error
                        ? eventsError.message
                        : "Failed to load events"}
                    </p>
                  </div>
                ) : events && events.length === 0 ? (
                  <div className="rounded-xl border border-neutral-200 py-10">
                    <EmptyState
                      icon={Webhook}
                      title="No events"
                      description="No events have been logged for this postback. Events will appear as they are logged."
                    />
                  </div>
                ) : (
                  <PostbackEventList
                    events={events || []}
                    onEventClick={openWithEvent}
                  />
                )}
              </div>
            </>
          )}
        </PageWidthWrapper>
      </PageContent>
    </>
  );
}
