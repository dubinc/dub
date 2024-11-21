import { prisma } from "@/lib/prisma";
import { Logo } from "@dub/ui";
import { BoltFill, CursorRays, LinesY, MoneyBills2 } from "@dub/ui/src/icons";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { subDays } from "date-fns";
import { Store } from "lucide-react";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { Header } from "../../header";
import { CTAButtons } from "./cta-buttons";
import { Screenshot } from "./screenshot";

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

export default async function SuccessPage({
  params: { programSlug },
  searchParams: { applicationId, enrollmentId },
}: {
  params: { programSlug: string };
  searchParams: { applicationId?: string; enrollmentId?: string };
}) {
  const program = await prisma.program.findUnique({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      wordmark: true,
      brandColor: true,
      commissionType: true,
      commissionAmount: true,
      isLifetimeRecurring: true,
    },
    where: {
      slug: programSlug,
    },
  });

  if (!program) {
    notFound();
  }

  const application = applicationId
    ? await prisma.programApplication.findFirst({
        where: {
          id: applicationId,
          programId: program.id,
          createdAt: {
            gte: subDays(new Date(), 3),
          },
        },
      })
    : null;

  const isEnrolled = !!enrollmentId;

  return (
    <div
      className="relative"
      style={
        {
          "--brand": program.brandColor || "#3b82f6",
          "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
        } as CSSProperties
      }
    >
      <Header
        program={{
          logo: program.logo,
          wordmark: program.wordmark,
        }}
        slug={programSlug}
        showLogin={false}
        showApply={false}
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:pt-20">
          <h1 className="text-4xl font-semibold">
            Application {isEnrolled ? "submitted" : "saved"}
          </h1>
          <div className="flex flex-col gap-4 text-base text-neutral-700">
            {isEnrolled && (
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
            {!isEnrolled && (
              <p>
                Complete your account setup on{" "}
                <strong className="font-semibold">Dub Partners</strong> to
                finish submitting your application.
              </p>
            )}
          </div>
        </div>

        {/* Screenshot */}
        <div className="relative mt-12">
          <Screenshot
            program={{ name: program.name, logo: program.logo }}
            className="h-auto w-full rounded border border-black/10 [mask-image:linear-gradient(black_80%,transparent)]"
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <div className="absolute -inset-[50%] rounded-full bg-white blur-lg" />
            <div className="relative flex items-center gap-2 rounded-full border border-neutral-100 bg-gradient-to-b from-white to-neutral-50 p-2 shadow-[0_8px_28px_0_#00000017]">
              <img
                className="size-10 shrink-0 rounded-full"
                src={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
                alt={`${program.name} logo`}
              />
              <BoltFill className="shrink-0 text-[var(--brand)] opacity-30" />
              <Logo className="size-10 shrink-0" />
            </div>
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

        <div className="mt-12 flex flex-col gap-3">
          <CTAButtons />
        </div>
      </div>
    </div>
  );
}
