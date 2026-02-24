import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getSession } from "@/lib/auth";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { prisma } from "@dub/prisma";
import { Reward } from "@dub/prisma/client";
import { CircleCheckFill } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { redirect } from "next/navigation";
import { AcceptProgramInviteButton } from "./accept-program-invite-button";
import { ProgramInviteConfetti } from "./program-invite-confetti";

export default async function ProgramInvitePage(props: {
  params: Promise<{ programSlug: string }>;
}) {
  const params = await props.params;
  const { programSlug } = params;

  const { user } = await getSession();
  if (!user) redirect(`/login?next=/programs/${programSlug}/invite`);

  const program = await prisma.program.findUnique({
    where: {
      slug: programSlug,
    },
    include: {
      partners: {
        where: {
          partnerId: user.defaultPartnerId,
        },
        include: {
          partnerGroup: true,
          saleReward: true,
          leadReward: true,
          clickReward: true,
          discount: true,
        },
      },
    },
  });

  if (!program || !program.partners.length) {
    redirect("/programs");
  }

  if (program.partners[0].status !== "invited") {
    redirect(`/programs/${programSlug}`);
  }

  const {
    partnerGroup: group,
    clickReward,
    leadReward,
    saleReward,
    discount,
  } = program.partners[0];

  if (!group) {
    redirect("/programs");
  }

  const rewards = [clickReward, leadReward, saleReward]
    .filter((r) => r !== null)
    .map((r) => serializeReward(r as Reward));

  const landerData = group.landerData
    ? programLanderSchema.parse(group.landerData)
    : null;

  return (
    <PageContent>
      <div className="flex w-full flex-col items-center justify-center px-4 py-10">
        <div
          className={cn(
            "relative z-0 flex items-center",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:50ms] [animation-duration:0.5s] [animation-fill-mode:both]",
          )}
        >
          <img
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="z-10 size-20 rotate-[-15deg] rounded-full drop-shadow-md"
          />
          <img
            src={user?.image || `${OG_AVATAR_URL}${user?.id}`}
            alt={user?.name || "Your avatar"}
            className="-ml-4 size-20 rotate-[15deg] rounded-full drop-shadow-md"
          />
          <div className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white p-0.5">
            <CircleCheckFill className="size-8 text-green-500" />
          </div>
        </div>

        <div
          className={cn(
            "flex w-full flex-col items-center text-center",
            "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:100ms] [animation-duration:0.5s] [animation-fill-mode:both]",
            "max-w-[400px]",
          )}
        >
          <h2 className="text-content-default mt-4 text-pretty text-lg font-semibold">
            You&apos;re invited to the {program.name} affiliate program
          </h2>
          <p className="text-content-subtle text-pretty text-base font-medium">
            Share {program.name} with your audience and earn a share of revenue
            on plans they purchase through your referral.
          </p>

          <div className="mt-4 flex w-full justify-center">
            <AcceptProgramInviteButton program={program} />
          </div>
        </div>
      </div>

      <PageWidthWrapper className="pb-20">
        <div className="mx-auto max-w-screen-md">
          <LanderHero
            program={program}
            landerData={landerData || {}}
            showLabel={false}
            className="mt-8 sm:mt-8"
            heading="h2"
            titleClassName="text-2xl"
          />

          <LanderRewards
            className="mt-4"
            rewards={rewards}
            discount={discount}
          />

          {landerData?.blocks && landerData.blocks.length > 0 && (
            <div className="mt-16 grid grid-cols-1 gap-10">
              {landerData.blocks.map((block, idx) => {
                const Component = BLOCK_COMPONENTS[block.type];
                return Component ? (
                  <Component key={idx} block={block} group={group} />
                ) : null;
              })}
            </div>
          )}
        </div>
      </PageWidthWrapper>

      <ProgramInviteConfetti />
    </PageContent>
  );
}
