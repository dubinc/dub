import { getProgram } from "@/lib/fetchers/get-program";
import { isProductionEnvironment } from "@/lib/sandbox/environment";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { constructMetadata } from "@dub/utils/src/functions";
import { notFound } from "next/navigation";

// The lander and the application form are published separately, so each page checks its own publish state
export async function getProgramApplyMetadata({
  params,
  page,
}: {
  params: Promise<{ programSlug: string; groupSlug?: string }>;
  page: "lander" | "applicationForm";
}) {
  const { programSlug, groupSlug } = await params;

  const partnerGroupSlug = groupSlug ?? DEFAULT_PARTNER_GROUP.slug;

  const program = await getProgram({
    slug: programSlug,
    groupSlug: partnerGroupSlug,
  });

  if (!program) {
    notFound();
  }

  const isLanderPublished = Boolean(
    program.group?.landerPublishedAt && program.group?.landerData,
  );
  const isPublished =
    page === "lander"
      ? isLanderPublished
      : Boolean(
          program.group?.applicationFormPublishedAt &&
            program.group?.applicationFormData,
        );
  const isProduction = isProductionEnvironment(program.environment);

  // Unpublished pages 404 or redirect, so don't soft-index them with rich program SEO.
  // Staging/sandbox pages stay shareable but noindex.
  if (!isPublished) {
    return constructMetadata({
      title: "Dub Partners",
      noIndex: true,
    });
  }

  return constructMetadata({
    title: `${program.name} Affiliate Program`,
    description: `Join the ${program.name} affiliate program and ${
      program.rewards && program.rewards.length > 0
        ? formatRewardDescription(program.rewards[0]).toLowerCase()
        : "earn commissions"
    } by referring ${program.name} to your friends and followers.`,
    image: `${APP_DOMAIN}/api/og/program?slug=${program.slug}${groupSlug ? `&groupSlug=${groupSlug}` : ""}`,
    // Avoid self-canonicalizing non-production URLs into the index.
    // Without a lander, /{slug} 404s or redirects, so point at this group's application form instead.
    ...(isProduction && {
      canonicalUrl: isLanderPublished
        ? `${PARTNERS_DOMAIN}/${program.slug}`
        : `${PARTNERS_DOMAIN}/${program.slug}${partnerGroupSlug === DEFAULT_PARTNER_GROUP.slug ? "" : `/${partnerGroupSlug}`}/apply`,
    }),
    noIndex: !isProduction,
  });
}
