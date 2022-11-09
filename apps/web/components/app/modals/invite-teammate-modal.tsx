import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "@/components/shared/blur-image";
import LoadingDots from "@/components/shared/icons/loading-dots";
import Modal from "@/components/shared/modal";
import useProject from "@/lib/swr/use-project";
import toast from "react-hot-toast";

function InviteTeammateModal({
  showInviteTeammateModal,
  setShowInviteTeammateModal,
}: {
  showInviteTeammateModal: boolean;
  setShowInviteTeammateModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const { project: { logo } = {} } = useProject();

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
            for 7 days.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setState("inviting");
            fetch(`/api/projects/${slug}/invite`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            }).then(async (res) => {
              if (res.status === 200) {
                setState("invited");
                toast.success("Invitation sent!");
                mutate(`/api/projects/${slug}/invite`);
                setShowInviteTeammateModal(false);
              } else {
                setState("idle");
                const response = await res.json();
                setError(response.error);
              }
            });
          }}
          className="flex flex-col bg-gray-50 px-4 py-8 text-left sm:px-16"
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

          <button
            disabled={state === "inviting"}
            className={`${
              state === "inviting"
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-black bg-black text-white hover:bg-white hover:text-black"
            } mt-4 mb-2 flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
          >
            {state === "inviting" ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Send invite</p>
            )}
          </button>
          {error && <p className="text-center text-xs text-red-500">{error}</p>}
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
