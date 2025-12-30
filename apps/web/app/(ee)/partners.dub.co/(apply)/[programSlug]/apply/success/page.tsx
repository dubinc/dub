import { getProgram } from "@/lib/fetchers/get-program";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { Logo } from "@dub/ui";
import { BoltFill, CursorRays, LinesY, MoneyBills2 } from "@dub/ui/icons";
import { OG_AVATAR_URL } from "@dub/utils";
import { Store } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { CSSProperties } from "react";
import { ApplyHeader } from "../../header";
import { CTAButtons } from "./cta-buttons";
import { PixelConversion } from "./pixel-conversion";
import { Screenshot } from "./screenshot";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Store,
    title: "Join other programs",
    description:
      "Our expanding marketplace is full of high-quality programs. We guarantee their quality.",
  },
  {
    icon: MoneyBills2,
    title: "Get paid how you want",
    description:
      "Connect your bank account, PayPal, or other payout choices. Get paid in any country.",
  },
  {
    icon: LinesY,
    title: "Full analytics",
    description:
      "View how your efforts are doing and how much you've earned with our program analytics.",
  },
  {
    icon: CursorRays,
    title: "Track everything",
    description:
      "Dub gives you the power to track every click, lead, and conversion. Knowledge of non-knowledge is power.",
  },
];

export default async function SuccessPage(props: {
  params: Promise<{ programSlug: string; groupSlug?: string }>;
  searchParams: Promise<{ applicationId?: string; enrollmentId?: string }>;
}) {
  const searchParams = await props.searchParams;

  const { applicationId, enrollmentId } = searchParams;

  const params = await props.params;

  const { programSlug, groupSlug } = params;

  const partnerGroupSlug = groupSlug ?? DEFAULT_PARTNER_GROUP.slug;

  const program = await getProgram({
    slug: programSlug,
    groupSlug: partnerGroupSlug,
  });

  if (
    !program ||
    !program.group ||
    !program.group.applicationFormData ||
    !program.group.applicationFormPublishedAt
  ) {
    // throw 404 if it's the default group, else redirect to the default group page
    if (partnerGroupSlug === DEFAULT_PARTNER_GROUP.slug) {
      notFound();
    } else {
      redirect(`/${programSlug}/apply`);
    }
  }

  const application = applicationId
    ? await prisma.programApplication.findUnique({
        where: {
          id: applicationId,
        },
      })
    : null;

  const hasPartnerProfile = !!enrollmentId;

  return (
    <>
      {program.slug === "perplexity" && <PixelConversion />}
      <div
        className="relative"
        style={
          {
            "--brand": program.group.brandColor || "#000000",
            "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
          } as CSSProperties
        }
      >
        <ApplyHeader
          group={program.group}
          showLogin={false}
          showApply={false}
        />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:pt-20">
            <span className="w-fit rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
              Step 2 of 2
            </span>
            <h1 className="text-4xl font-semibold">
              {hasPartnerProfile
                ? "Application submitted"
                : "Finish your application"}
            </h1>
            <div className="flex flex-col gap-4 text-base text-neutral-700">
              {hasPartnerProfile && (
                <p>
                  Your application has been submitted for review.
                  {application && (
                    <>
                      {" "}
                      You'll receive an update at{" "}
                      <strong className="font-semibold">
                        {application.email}
                      </strong>
                      .
                    </>
                  )}
                </p>
              )}
              {!hasPartnerProfile && (
                <p>
                  Your application to{" "}
                  <strong className="font-semibold">{program.name}</strong> has
                  been saved, but you still need to create your{" "}
                  <strong className="font-semibold">Dub Partners</strong>{" "}
                  account to complete your application.
                  <br />
                  <br />
                  Once you create your account, your application will be
                  submitted to <b>{program.name}</b> and you'll hear back from
                  them{" "}
                  <strong className="font-semibold">
                    {application?.email
                      ? `at ${application.email}`
                      : "via email"}
                  </strong>
                  .
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-12 flex flex-col gap-3">
            <CTAButtons />
          </div>

          {/* Screenshot */}
          <div className="relative mt-16">
            <Screenshot
              program={{ name: program.name, logo: program.logo }}
              className="h-auto w-full rounded border border-black/10 [mask-image:linear-gradient(black_80%,transparent)]"
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <div className="absolute -inset-[50%] rounded-full bg-white blur-lg" />

              {programSlug !== "dub" && (
                <div className="relative flex items-center gap-2 rounded-full border border-neutral-100 bg-gradient-to-b from-white to-neutral-50 p-2 shadow-[0_8px_28px_0_#00000017]">
                  <img
                    className="size-10 shrink-0 rounded-full"
                    src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                    alt={`${program.name} logo`}
                  />
                  <BoltFill className="shrink-0 text-[var(--brand)] opacity-30" />
                  <Logo className="size-10 shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* Feature grid */}
          <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-[var(--brand)]" />
                <h3 className="font-semibold text-neutral-900">{title}</h3>
                <p className="text-neutral-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
