import { prismaEdge } from "@/lib/prisma/edge";
import { Button, Calendar6, MoneyBills2, Wordmark } from "@dub/ui";
import { notFound } from "next/navigation";

export const runtime = "edge";

export default async function ApplyPage({
  params,
}: {
  params: { programSlug: string };
}) {
  const { programSlug } = params;
  const program = await prismaEdge.program.findUnique({
    where: {
      slug: programSlug,
    },
  });

  if (!program) {
    notFound();
  }

  return (
    <div className="relative">
      <div className="relative z-10 mx-auto h-screen w-full max-w-screen-sm border-x border-gray-200 bg-white">
        <div className="flex items-center justify-between p-6">
          <Wordmark className="h-8" />
          <Button text="Apply" className="h-8 w-fit" />
        </div>
        <div className="grid gap-4 p-6 pt-24">
          <p className="font-mono text-sm text-purple-600">AFFILIATE PROGRAM</p>
          <h1 className="text-4xl font-semibold">
            Join the {program.name} affiliate program
          </h1>
          <p className="text-gray-500">
            Share {program.name} with your audience and for each subscription
            generated through your referral, you'll earn a share of the revenue
            on any plans they purchase.
          </p>
          <p className="text-xs text-gray-400">
            Read our <u>Terms of Service</u> for more details.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: MoneyBills2,
                title: "Commission",
                value: program.commissionAmount,
              },
              {
                icon: Calendar6,
                title: "Duration",
                value: program.isLifetimeRecurring ? "Lifetime" : "Recurring",
              },
            ].map(({ icon: Icon, title, value }) => (
              <div className="rounded-xl bg-gray-100 p-4">
                <Icon className="size-5 text-gray-500" />
                <div className="mt-6">
                  <p className="font-mono text-lg text-black">{value}</p>
                  <p className="text-sm text-gray-500">{title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex h-fit w-full items-center justify-center">
        <img
          src="https://assets.dub.co/misc/program-apply-grid.svg"
          alt="program apply grid"
          width={1280}
          height={480}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>
    </div>
  );
}
