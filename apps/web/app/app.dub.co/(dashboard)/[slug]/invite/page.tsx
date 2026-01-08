import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import {
  Book2Fill,
  CircleCheckFill,
  LifeRingFill,
  MsgsFill,
  Tooltip,
  Wordmark,
} from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

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
        expires: {
          gte: new Date(),
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
                    image: true,
                  },
                },
              },
              where: {
                user: {
                  isMachine: false,
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!invite) redirect(`/${slug}`);

  return (
    <div className="rounded-t-[inherit] bg-white px-4">
      <div className="flex min-h-[calc(100vh-10rem)] w-full flex-col items-center justify-center px-4 py-10">
        <div className="flex w-full flex-col items-center">
          <div className="animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-duration:0.5s] [animation-fill-mode:both]">
            <Wordmark className="h-8" />
          </div>

          <div
            className={cn(
              "relative z-0 mt-8 flex items-center",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:0.1s] [animation-duration:0.5s] [animation-fill-mode:both]",
            )}
          >
            <img
              src={
                invite.project.logo || `${OG_AVATAR_URL}${invite.project.name}`
              }
              alt={invite.project.name}
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
              "flex flex-col items-center text-center",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:0.2s] [animation-duration:0.5s] [animation-fill-mode:both]",
            )}
          >
            <h2 className="text-content-default mt-4 text-lg font-semibold">
              Welcome to the {invite.project.name} workspace
            </h2>
            <p className="text-content-subtle text-base font-medium">
              You've been added as a{invite.role === "owner" ? "n" : ""}{" "}
              <Tooltip
                content={
                  invite.role === "owner"
                    ? "You have the highest workspace permissions. [Learn more](https://dub.co/help/article/workspace-roles#member-role)"
                    : "You have limited workspace permissions. [Learn more](https://dub.co/help/article/workspace-roles#member-role)"
                }
              >
                <span className="underline decoration-dotted underline-offset-2">
                  {invite.role}
                </span>
              </Tooltip>
            </p>
          </div>

          <div
            className={cn(
              "mt-8 flex w-full max-w-[400px] flex-col gap-3",
              "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:0.1s] [animation-duration:0.5s] [animation-fill-mode:both]",
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
    </div>
  );
}

// function AcceptInviteModal({
//   showAcceptInviteModal,
//   setShowAcceptInviteModal,
// }: {
//   showAcceptInviteModal: boolean;
//   setShowAcceptInviteModal: Dispatch<SetStateAction<boolean>>;
// }) {
//   const { slug } = useParams<{ slug: string }>();
//   const { error } = useWorkspace();
//   const { data: session } = useSession();
//   const router = useRouter();

//   const [accepting, setAccepting] = useState(false);
//   const [declining, setDeclining] = useState(false);

//   const acceptInvite = async () => {
//     setAccepting(true);

//     try {
//       const response = await fetch(`/api/workspaces/${slug}/invites/accept`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         toast.error(error.message || "Failed to accept invite.");
//         return;
//       }

//       if (session?.user) {
//         posthog.identify(session.user["id"], {
//           email: session.user.email,
//           name: session.user.name,
//         });
//       }

//       posthog.capture("accepted_workspace_invite", {
//         workspace: slug,
//       });

//       await mutatePrefix(["/api/workspaces", "/api/programs"]);
//       router.replace(`/${slug}`);
//       setShowAcceptInviteModal(false);
//       toast.success("You now are a part of this workspace!");
//     } finally {
//       setAccepting(false);
//     }
//   };

//   const declineInvite = async () => {
//     setDeclining(true);

//     try {
//       const response = await fetch(`/api/workspaces/${slug}/invites/decline`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         toast.error(error.message || "Failed to decline invite.");
//         return;
//       }

//       await mutatePrefix("/api/workspaces");
//       router.replace("/workspaces");
//       setShowAcceptInviteModal(false);
//       toast.success("You have declined the invite.");
//     } finally {
//       setDeclining(false);
//     }
//   };

//   return (
//     <Modal
//       showModal={showAcceptInviteModal}
//       setShowModal={setShowAcceptInviteModal}
//       preventDefaultClose
//     >
//       {error?.status === 409 ? (
//         <>
//           <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
//             <Logo />
//             <h3 className="text-lg font-medium">Workspace Invitation</h3>
//             <p className="text-center text-sm text-neutral-500">
//               You've been invited to join and collaborate on the{" "}
//               <span className="font-mono text-purple-600">
//                 {slug || "......"}
//               </span>{" "}
//               workspace on {process.env.NEXT_PUBLIC_APP_NAME}
//             </p>
//           </div>
//           <div className="flex gap-2 bg-neutral-50 px-4 py-8 text-left sm:px-16">
//             <Button
//               variant="secondary"
//               onClick={declineInvite}
//               loading={declining}
//               text="Decline invite"
//               disabled={accepting}
//               className="w-fit"
//             />

//             <Button
//               onClick={acceptInvite}
//               loading={accepting}
//               text="Accept invite"
//               disabled={declining}
//             />
//           </div>
//         </>
//       ) : (
//         <>
//           <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
//             <Logo />
//             <h3 className="text-lg font-medium">
//               Workspace Invitation Expired
//             </h3>
//             <p className="text-center text-sm text-neutral-500">
//               This invite has expired or is no longer valid.
//             </p>
//           </div>
//           <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
//             <Button
//               text="Back to dashboard"
//               onClick={() => {
//                 router.push("/");
//                 setShowAcceptInviteModal(false);
//               }}
//             />
//           </div>
//         </>
//       )}
//     </Modal>
//   );
// }
