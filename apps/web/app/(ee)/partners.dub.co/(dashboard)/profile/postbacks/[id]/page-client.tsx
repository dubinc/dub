"use client";

import { PartnerPostbackProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useAddEditPostbackModal } from "@/ui/postbacks/add-edit-postback-modal";
import { PartnerPostbackActions } from "@/ui/postbacks/partner-postback-actions";
import { PostbackStatus } from "@/ui/postbacks/postback-status";
import { BackLink } from "@/ui/shared/back-link";
import { MaxWidthWrapper, TokenAvatar } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  } = useSWR<PartnerPostbackProps>(
    postbackId ? `/api/partner-profile/postbacks/${postbackId}` : null,
    fetcher,
  );

  const { openEditPostbackModal, AddEditPostbackModal } =
    useAddEditPostbackModal(() => mutate());

  useEffect(() => {
    if (error && (error as { status?: number }).status === 404) {
      router.replace("/profile/postbacks");
    }
  }, [error, router]);

  return (
    <>
      <PageContent
        title="Postbacks"
        titleInfo={{
          title:
            "Receive HTTP requests when events like leads, sales, or commissions occur in your partner programs.",
          href: "https://dub.co/help",
        }}
      >
        <PageWidthWrapper>
          <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
            <BackLink href="/profile/postbacks">Back to postbacks</BackLink>
            {isLoading && !postback ? (
              <>
                <div className="flex justify-between gap-8 sm:items-center">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="w-fit flex-none rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2">
                      <div className="size-8 animate-pulse rounded-full bg-neutral-100" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-5 w-28 animate-pulse rounded-full bg-neutral-100" />
                      <div className="h-3 w-48 animate-pulse rounded-full bg-neutral-100" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-10 animate-pulse rounded bg-neutral-100"
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : error || !postback ? (
              <div className="rounded-xl border border-neutral-200 py-10 text-center">
                <p className="text-sm text-red-600">
                  {error instanceof Error
                    ? error.message
                    : "Postback not found"}
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

                <PartnerPostbackActions
                  postback={postback}
                  openPopover={openPopover}
                  setOpenPopover={setOpenPopover}
                  onEditPostback={openEditPostbackModal}
                  onMutate={() => mutate()}
                />
              </div>
            )}
          </MaxWidthWrapper>
        </PageWidthWrapper>
      </PageContent>
      <AddEditPostbackModal />
    </>
  );
}
