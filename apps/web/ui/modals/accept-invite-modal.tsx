import useWorkspace from "@/lib/swr/use-workspace";
import { LoadingDots, Logo, Modal } from "@dub/ui";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function AcceptInviteModal({
  showAcceptInviteModal,
  setShowAcceptInviteModal,
}: {
  showAcceptInviteModal: boolean;
  setShowAcceptInviteModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug } = useParams() as { slug: string };
  const [accepting, setAccepting] = useState(false);
  const { error } = useWorkspace();
  const { data: session } = useSession();

  return (
    <Modal
      showModal={showAcceptInviteModal}
      setShowModal={setShowAcceptInviteModal}
      preventDefaultClose
    >
      {error?.status === 409 ? (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">Workspace Invitation</h3>
            <p className="text-center text-sm text-gray-500">
              You've been invited to join and collaborate on the{" "}
              <span className="font-mono text-purple-600">
                {slug || "......"}
              </span>{" "}
              workspace on {process.env.NEXT_PUBLIC_APP_NAME}
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
            <button
              onClick={() => {
                setAccepting(true);
                fetch(`/api/workspaces/${slug}/invites/accept`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }).then(async () => {
                  if (session?.user) {
                    posthog.identify(session.user["id"], {
                      email: session.user.email,
                      name: session.user.name,
                    });
                  }
                  posthog.capture("accepted_workspace_invite", {
                    workspace: slug,
                  });
                  await Promise.all([
                    mutate("/api/workspaces"),
                    mutate(`/api/workspaces/${slug}`),
                  ]);
                  setShowAcceptInviteModal(false);
                  toast.success("You now are a part of this workspace!");
                });
              }}
              disabled={accepting}
              className={`${
                accepting
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-black bg-black text-white hover:bg-white hover:text-black"
              } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
            >
              {accepting ? <LoadingDots /> : <p>Accept invite</p>}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">
              Workspace Invitation Expired
            </h3>
            <p className="text-center text-sm text-gray-500">
              This invite has expired or is no longer valid.
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
            <Link
              href="/"
              className="flex h-10 w-full items-center justify-center rounded-md border border-black bg-black text-sm text-white transition-all hover:bg-white hover:text-black focus:outline-none"
            >
              Back to dashboard
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
}

export function useAcceptInviteModal() {
  const [showAcceptInviteModal, setShowAcceptInviteModal] = useState(false);

  const AcceptInviteModalCallback = useCallback(() => {
    return (
      <AcceptInviteModal
        showAcceptInviteModal={showAcceptInviteModal}
        setShowAcceptInviteModal={setShowAcceptInviteModal}
      />
    );
  }, [showAcceptInviteModal, setShowAcceptInviteModal]);

  return useMemo(
    () => ({
      setShowAcceptInviteModal,
      AcceptInviteModal: AcceptInviteModalCallback,
    }),
    [setShowAcceptInviteModal, AcceptInviteModalCallback],
  );
}
