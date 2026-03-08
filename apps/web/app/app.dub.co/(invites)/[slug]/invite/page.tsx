import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Project, ProjectInvite, User } from "@dub/prisma/client";
import {
  Avatar,
  Book2Fill,
  CircleCheckFill,
  CircleHalfDottedClock,
  DubLinksIcon,
  DubPartnersIcon,
  LifeRingFill,
  MsgsFill,
  Tooltip,
  Wordmark,
} from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcceptInviteButton } from "./accept-invite-button";
import { CloseInviteButton } from "./close-invite-button";
import { InviteConfetti } from "./invite-confetti";

const MAX_TEAM_DISPLAY = 4;

export default async function WorkspaceInvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getSession();

  if (!session) redirect(`/login?next=/${slug}/invite`);

  const [user, invite] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
      where: {
        id: session.user.id,
      },
    }),
    prisma.projectInvite.findFirst({
      where: {
        email: session.user.email,
        project: {
          slug,
        },
      },
      include: {
        project: {
          select: {
            name: true,
            logo: true,
            defaultProgramId: true,
            users: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
              where: {
                user: {
                  isMachine: false,
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    }),
  ]);

  if (!invite) redirect(`/${slug}`);

  // Expired invite
  if (invite.expires < new Date()) {
    return (
      <>
        <div className="z-10 flex items-center justify-end p-4">
          <CloseInviteButton goToOnboarding={user._count.projects === 0} />
        </div>
        <div className="-mt-16 flex grow flex-col items-center justify-center">
          <Hero isExpired invite={invite} user={user} />
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end p-4">
        <CloseInviteButton goToOnboarding={user._count.projects === 0} />
      </div>
      <div className="flex w-full flex-col items-center justify-center px-4 py-10">
        <Hero invite={invite} user={user} isExpired={false} />
        <div className="flex w-full flex-col items-center">
          <div
            className={cn(
              "mt-8 flex w-full max-w-[400px] flex-col gap-3",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:150ms] [animation-duration:0.5s] [animation-fill-mode:both]",
            )}
          >
            <h3 className="text-content-default font-semibold">
              Products {invite.project.name} uses
            </h3>

            <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y rounded-lg border">
              {[
                {
                  icon: (
                    <div className="flex size-5 items-center justify-center rounded bg-orange-400">
                      <DubLinksIcon className="size-3 text-orange-900" />
                    </div>
                  ),
                  title: "Dub Links",
                  href: "https://dub.co/links",
                  cta: "Learn more",
                },
                ...(invite.project.defaultProgramId
                  ? [
                      {
                        icon: (
                          <div className="flex size-5 items-center justify-center rounded bg-violet-400">
                            <DubPartnersIcon className="size-3 text-violet-900" />
                          </div>
                        ),
                        title: "Dub Partners",
                        href: "https://dub.co/partners",
                        cta: "Learn more",
                      },
                    ]
                  : []),
              ].map(({ icon, title, href, cta }) => (
                <div
                  key={href}
                  className="flex items-center justify-between gap-2 px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {icon}
                    <div className="text-content-default text-sm font-medium">
                      {title}
                    </div>
                  </div>

                  <Link
                    href={href}
                    target="_blank"
                    className="border-subtle bg-bg-inverted hover:bg-bg-inverted/90 flex h-7 items-center rounded-lg border px-2.5 text-sm text-white transition-transform active:scale-[0.98]"
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "mt-8 flex w-full max-w-[400px] flex-col gap-3",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:150ms] [animation-duration:0.5s] [animation-fill-mode:both]",
            )}
          >
            <h3 className="text-content-default font-semibold">The team</h3>

            <div className="relative overflow-hidden">
              <div
                className={cn(
                  "border-border-subtle bg-bg-muted divide-border-subtle relative flex flex-col divide-y rounded-lg border",
                  invite.project.users.length > MAX_TEAM_DISPLAY &&
                    "[mask-image:linear-gradient(0deg,transparent,black_45px)]",
                )}
              >
                {invite.project.users
                  .slice(0, MAX_TEAM_DISPLAY)
                  .map(({ user: { id, name, email, image } }) => (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar user={{ id, name, image }} className="size-6" />
                        <span className="text-content-default min-w-0 truncate text-sm font-medium">
                          {name || email}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {invite.project.users.length > MAX_TEAM_DISPLAY && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
                  <span className="text-content-subtle select-none text-xs font-medium">
                    +{invite.project.users.length - MAX_TEAM_DISPLAY} more
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "mt-8 flex w-full max-w-[400px] flex-col gap-3",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:250ms] [animation-duration:0.5s] [animation-fill-mode:both]",
            )}
          >
            <h3 className="text-content-default font-semibold">
              Additional resources
            </h3>

            <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y rounded-lg border">
              {[
                {
                  icon: LifeRingFill,
                  title: "Help center",
                  description: "Answers to your questions",
                  href: "https://dub.co/help",
                  cta: "Read",
                },
                {
                  icon: Book2Fill,
                  title: "Docs",
                  description: "Platform documentation",
                  href: "https://dub.co/docs",
                  cta: "Learn",
                },
                {
                  icon: MsgsFill,
                  title: "Support",
                  description: "Product support or help requests",
                  href: "https://dub.co/contact/support",
                  cta: "Chat",
                },
              ].map(({ icon: Icon, title, description, href, cta }) => (
                <div
                  key={href}
                  className="flex items-center justify-between gap-2 px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-black/5">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-content-default text-sm font-medium">
                        {title}
                      </div>
                      <p className="text-content-subtle truncate text-xs font-medium">
                        {description}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={href}
                    target="_blank"
                    className="border-subtle bg-bg-default hover:bg-bg-muted flex h-7 items-center rounded-lg border px-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <InviteConfetti />
    </div>
  );
}

function Hero({
  invite,
  user,
  isExpired,
}: {
  invite: Pick<ProjectInvite, "role" | "expires"> & {
    project: Pick<Project, "logo" | "name">;
  };
  user: Pick<User, "id" | "image" | "name"> & { _count: { projects: number } };
  isExpired: boolean;
}) {
  return (
    <>
      <div className="animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-duration:0.5s] [animation-fill-mode:both]">
        <Wordmark className="h-8" />
      </div>

      <div
        className={cn(
          "relative z-0 mt-8 flex items-center",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:50ms] [animation-duration:0.5s] [animation-fill-mode:both]",
        )}
      >
        <img
          src={invite.project.logo || `${OG_AVATAR_URL}${invite.project.name}`}
          alt={invite.project.name}
          className="z-10 size-20 rotate-[-15deg] rounded-full drop-shadow-md"
        />
        <img
          src={user?.image || `${OG_AVATAR_URL}${user?.id}`}
          alt={user?.name || "Your avatar"}
          className="-ml-4 size-20 rotate-[15deg] rounded-full drop-shadow-md"
        />
        <div className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white p-0.5">
          {isExpired ? (
            <div className="rounded-full bg-neutral-200 p-1">
              <CircleHalfDottedClock className="size-5 text-neutral-500" />
            </div>
          ) : (
            <CircleCheckFill className="size-8 text-green-500" />
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-col items-center text-center",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:100ms] [animation-duration:0.5s] [animation-fill-mode:both]",
          !isExpired ? "max-w-[400px]" : "max-w-[440px]",
        )}
      >
        <h2 className="text-content-default mt-4 text-pretty text-lg font-semibold">
          {!isExpired ? (
            <>Welcome to the {invite.project.name} workspace</>
          ) : (
            <>Your invite to the {invite.project.name} workspace has expired</>
          )}
        </h2>
        <p className="text-content-subtle text-pretty text-base font-medium">
          {!isExpired ? (
            <>
              You've been added as a{invite.role === "owner" ? "n" : ""}{" "}
              <Tooltip
                content={
                  invite.role === "owner"
                    ? "You have the highest workspace permissions. [Learn more](https://dub.co/help/article/workspace-roles#member-role)"
                    : "You have limited workspace permissions. [Learn more](https://dub.co/help/article/workspace-roles#member-role)"
                }
              >
                <span className="underline decoration-dotted underline-offset-2">
                  {invite.role === "billing" ? "billing user" : invite.role}
                </span>
              </Tooltip>
            </>
          ) : (
            <>Please contact the owner to request another invite.</>
          )}
        </p>

        <div className="mt-4 flex w-full justify-center">
          {!isExpired ? (
            <AcceptInviteButton />
          ) : (
            <CloseInviteButton
              goToOnboarding={user._count.projects === 0}
              variant="full"
            />
          )}
        </div>
      </div>
    </>
  );
}
