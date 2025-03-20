import { getProgram } from "@/lib/fetchers/get-program";
import { getReward } from "@/lib/fetchers/get-reward";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { Wordmark } from "@dub/ui";
import { APP_DOMAIN } from "@dub/utils";
import { constructMetadata } from "@dub/utils/src/functions";
import { notFound } from "next/navigation";
import { PropsWithChildren } from "react";

export async function generateMetadata({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await getProgram({ slug: programSlug });

  if (!program || !program.landerData || !program.defaultRewardId) {
    notFound();
  }

  const reward = await getReward({ id: program.defaultRewardId });

  return constructMetadata({
    title: `${program.name} Affiliate Program`,
    description: `Join the ${program.name} affiliate program and earn ${formatRewardDescription(
      { reward },
    )} by referring ${program.name} to your friends and followers.`,
    image: `${APP_DOMAIN}/api/og/program?slug=${program.slug}`,
  });
}

export async function generateStaticParams() {
  const programs = await prisma.program.findMany({
    where: {
      landerData: {
        not: Prisma.JsonNull,
      },
    },
    select: {
      slug: true,
    },
  });

  return programs.map((program) => ({
    programSlug: program.slug,
  }));
}

export default async function ApplyLayout({
  children,
  params: { programSlug },
}: PropsWithChildren<{ params: { programSlug: string } }>) {
  const program = await getProgram({ slug: programSlug });

  if (!program || !program.landerData) {
    notFound();
  }

  return (
    <div className="relative">
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-screen-sm bg-white">
        <div className="pointer-events-none absolute left-0 top-0 h-screen w-full border-x border-neutral-200 [mask-image:linear-gradient(black,transparent)]" />
        {children}
        {/* Footer */}
        <footer className="mt-14 flex flex-col items-center gap-4 py-6 text-center text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            Powered by <Wordmark className="h-3.5" />
          </span>
          <span className="flex items-center gap-2">
            <a
              href="https://dub.co/legal/terms"
              target="_blank"
              className="transition-colors duration-75 hover:text-neutral-600"
            >
              Terms of Service
            </a>
            <span className="text-base text-neutral-200">&bull;</span>
            <a
              href="https://dub.co/legal/privacy"
              target="_blank"
              className="transition-colors duration-75 hover:text-neutral-600"
            >
              Privacy Policy
            </a>
          </span>
        </footer>
      </div>

      {/* Background grid */}
      <div className="absolute inset-0 flex h-fit w-full items-center justify-center">
        <img
          src="https://assets.dub.co/misc/program-apply-grid.svg"
          alt=""
          width={1280}
          height={480}
          className="[mask-image:radial-gradient(70%_100%_at_50%_0%,black_30%,transparent)]"
        />
      </div>
    </div>
  );
}
