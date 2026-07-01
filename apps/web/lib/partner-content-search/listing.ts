import { DISCOVERABLE_NETWORK_STATUSES } from "@/lib/api/network/partner-network-listing-where";
import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import { PARTNER_CONTENT_SEARCH_MODELS } from "./constants";
import type { PartnerContentSearchRow } from "./search-utils";

// Empty-query path: most recent embedded content across the eligible network,
// shaped into the same per-chunk row as the vector search so downstream is identical.
export async function listPartnerNetworkContent({
  programId,
  platforms,
  country,
  partnerIds,
  starred,
  limit,
}: {
  programId: string;
  platforms?: PlatformType[];
  country?: string;
  partnerIds?: string[];
  starred?: boolean;
  limit: number;
}) {
  const discoveredFilters: Prisma.PartnerWhereInput[] = [
    {
      discoveredByPrograms: {
        none: {
          programId,
          ignoredAt: {
            not: null,
          },
        },
      },
    },
  ];

  if (starred === true) {
    discoveredFilters.push({
      discoveredByPrograms: {
        some: {
          programId,
          starredAt: {
            not: null,
          },
        },
      },
    });
  } else if (starred === false) {
    discoveredFilters.push({
      discoveredByPrograms: {
        none: {
          programId,
          starredAt: {
            not: null,
          },
        },
      },
    });
  }

  const contentItems = await prisma.partnerContentItem.findMany({
    where: {
      ...(partnerIds?.length && {
        partnerId: {
          in: partnerIds,
        },
      }),
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      embeddedChunkCount: {
        gt: 0,
      },
      ...(platforms?.length && {
        partnerPlatform: {
          type: { in: platforms },
        },
      }),
      partner: {
        networkStatus: {
          in: DISCOVERABLE_NETWORK_STATUSES,
        },
        ...(country && { country }),
        programs: {
          none: {
            programId,
          },
        },
        AND: discoveredFilters,
      },
    },
    select: {
      id: true,
      partnerId: true,
      platformContentId: true,
      url: true,
      contentType: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      publishedAt: true,
      durationMs: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      saveCount: true,
      partnerPlatform: {
        select: {
          type: true,
          identifier: true,
        },
      },
      chunks: {
        where: {
          embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
        },
        select: {
          id: true,
          source: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 1,
      },
    },
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: limit,
  });

  return contentItems.flatMap<PartnerContentSearchRow>((contentItem) => {
    const chunk = contentItem.chunks[0];
    if (!chunk) return [];

    return {
      chunkId: chunk.id,
      partnerContentItemId: contentItem.id,
      partnerId: contentItem.partnerId,
      platformType: contentItem.partnerPlatform.type,
      platformIdentifier: contentItem.partnerPlatform.identifier,
      platformContentId: contentItem.platformContentId,
      contentUrl: contentItem.url,
      contentType: contentItem.contentType,
      contentTitle: contentItem.title,
      contentDescription: contentItem.description,
      contentThumbnailUrl: contentItem.thumbnailUrl,
      contentPublishedAt: contentItem.publishedAt,
      contentDurationMs: contentItem.durationMs,
      contentViewCount: contentItem.viewCount,
      contentLikeCount: contentItem.likeCount,
      contentCommentCount: contentItem.commentCount,
      contentShareCount: contentItem.shareCount,
      contentSaveCount: contentItem.saveCount,
      chunkSource: chunk.source,
      chunkText: "",
      startMs: null,
      endMs: null,
      distance: 0,
    };
  });
}
