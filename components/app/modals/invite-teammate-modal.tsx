import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "#/ui/blur-image";
import va from "@vercel/analytics";
import Modal from "@/components/shared/modal";
import useProject from "@/lib/swr/use-project";
import { toast } from "sonner";
import Button from "#/ui/button";

function InviteTeammateModal({
  showInviteTeammateModal,
  setShowInviteTeammateModal,
}: {
  showInviteTeammateModal: boolean;
  setShowInviteTeammateModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const { logo } = useProject();

  return (
    <Modal
      showModal={showInviteTeammateModal}
      setShowModal={setShowInviteTeammateModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={logo || `/_static/logo.png`}
            alt={"Invite Teammate"}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Invite Teammate</h3>
          <p className="text-center text-sm text-gray-500">
            Invite a teammate to join your project. Invitations will be valid
            for 14 days.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setInviting(true);
            fetch(`/api/projects/${slug}/invite`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            }).then(async (res) => {
              setInviting(false);
              if (res.status === 200) {
                toast.success("Invitation sent!");
                va.track("User invited teammate", {
                  project: slug,
                });
                mutate(`/api/projects/${slug}/invite`);
                setShowInviteTeammateModal(false);
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
          className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16"
        >
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700">
              Email
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="email"
                name="email"
                id="email"
                placeholder="panic@thedis.co"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-gray-300 pr-10 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
              />
            </div>
          </div>

          <Button loading={inviting} text="Send invite" />
        </form>
      </div>
    </Modal>
  );
}

export function useInviteTeammateModal() {
  const [showInviteTeammateModal, setShowInviteTeammateModal] = useState(false);

  const InviteTeammateModalCallback = useCallback(() => {
    return (
      <InviteTeammateModal
        showInviteTeammateModal={showInviteTeammateModal}
        setShowInviteTeammateModal={setShowInviteTeammateModal}
      />
    );
  }, [showInviteTeammateModal, setShowInviteTeammateModal]);

  return useMemo(
    () => ({
      setShowInviteTeammateModal,
      InviteTeammateModal: InviteTeammateModalCallback,
    }),
    [setShowInviteTeammateModal, InviteTeammateModalCallback],
  );
}
