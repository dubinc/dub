import { getPartnerRewind } from "@/lib/api/partners/get-partner-rewind";
import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { prisma } from "@dub/prisma";
import { Grid } from "@dub/ui";
import { cn } from "@dub/utils";
import { redirect } from "next/navigation";
import { PartnerRewind2025PageClient } from "./page-client";

export default async function PartnerRewind2025Page() {
  const { user } = await getSession();

  if (!user.defaultPartnerId) redirect("/");

  const partnerUser = await prisma.partnerUser.findUnique({
    select: { partnerId: true },
    where: {
      userId_partnerId: {
        userId: user.id,
        partnerId: user.defaultPartnerId,
      },
    },
  });

  if (!partnerUser) redirect("/");

  const partnerRewind = await getPartnerRewind({
    partnerId: partnerUser.partnerId,
  });

  if (!partnerRewind) redirect("/");

  return (
    <PageContent
      title="Partner rewind"
      className="flex h-full flex-col"
      contentWrapperClassName="grow pt-0 lg:pt-0"
    >
      <div className="bg-bg-muted relative size-full">
        <div className="animate-fade-in absolute inset-0 overflow-hidden [mask-image:radial-gradient(transparent,black)]">
          <Grid
            cellSize={56}
            patternOffset={[-4, -28]}
            className="text-border-default/80"
          />
          <Gradient className="absolute bottom-0 left-0 h-[720px] w-96 -translate-x-1/2 translate-y-1/2 -rotate-[55deg] opacity-30" />
          <Gradient className="absolute right-0 top-0 h-[720px] w-96 -translate-y-1/2 translate-x-1/2 -rotate-[55deg] opacity-20" />
        </div>

        <div className="scrollbar-hide flex size-full items-center justify-center overflow-y-auto">
          <PartnerRewind2025PageClient partnerRewind={partnerRewind} />
        </div>
      </div>
    </PageContent>
  );
}

function Gradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "[background-image:radial-gradient(140%_146%_at_93%_14%,#72FE7D,rgba(114,254,125,0)_50%),radial-gradient(126%_82%_at_56%_100%,#FD3A4E,rgba(253,58,78,0)_50%),radial-gradient(131%_124%_at_11%_35%,#855AFC,rgba(133,90,252,0)_50%),radial-gradient(117%_77%_at_100%_100%,#E4C795,rgba(228,199,149,0)_50%),radial-gradient(86%_74%_at_40%_59%,#3A8BFD,rgba(58,139,253,0)_50%),radial-gradient(115%_96%_at_42%_69%,#EEA5BA,rgba(238,165,186,0)_50%)]",
        "blur-[60px]",
        className,
      )}
    />
  );
}
