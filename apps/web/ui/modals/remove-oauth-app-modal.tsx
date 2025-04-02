import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { BlurImage, Button, Logo, Modal, useMediaQuery } from "@dub/ui";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function RemoveOAuthAppModal({
  showRemoveOAuthAppModal,
  setShowRemoveOAuthAppModal,
  oAuthApp,
}: {
  showRemoveOAuthAppModal: boolean;
  setShowRemoveOAuthAppModal: Dispatch<SetStateAction<boolean>>;
  oAuthApp:
    | Pick<
        OAuthAppProps,
        "id" | "name" | "description" | "logo" | "installations"
      >
    | undefined;
}) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [deleting, setDeleting] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, logo } = useWorkspace();

  const deleteOAuthApp = async () => {
    setDeleting(true);

    const response = await fetch(
      `/api/oauth/apps/${oAuthApp?.id}?workspaceId=${workspaceId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    setDeleting(false);

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error.message);
    }

    setShowRemoveOAuthAppModal(false);
    router.push(`/${workspaceSlug}/settings/oauth-apps`);
  };

  if (!oAuthApp) {
    return null;
  }

  return (
    <Modal
      showModal={showRemoveOAuthAppModal}
      setShowModal={setShowRemoveOAuthAppModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt="Workspace logo"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Delete {oAuthApp.name}</h3>
        <p className="text-center text-sm text-neutral-500">
          Deleting this application will invalidate any access tokens authorized
          by users. Are you sure you want to continue?
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();

          toast.promise(deleteOAuthApp(), {
            loading: "Deleting application...",
            success: "Application deleted successfully!",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold text-black">{oAuthApp.name}</span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={oAuthApp.name}
              required
              autoFocus={false}
              autoComplete="off"
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <Button
          text="Confirm delete"
          variant="danger"
          loading={deleting}
          autoFocus={!isMobile}
          type="submit"
        />
      </form>
    </Modal>
  );
}

export function useRemoveOAuthAppModal({
  oAuthApp,
}: {
  oAuthApp:
    | Pick<
        OAuthAppProps,
        "id" | "name" | "description" | "logo" | "installations"
      >
    | undefined;
}) {
  const [showRemoveOAuthAppModal, setShowRemoveOAuthAppModal] = useState(false);

  const RemoveOAuthAppModalCallback = useCallback(() => {
    return (
      <RemoveOAuthAppModal
        showRemoveOAuthAppModal={showRemoveOAuthAppModal}
        setShowRemoveOAuthAppModal={setShowRemoveOAuthAppModal}
        oAuthApp={oAuthApp}
      />
    );
  }, [showRemoveOAuthAppModal, setShowRemoveOAuthAppModal]);

  return useMemo(
    () => ({
      setShowRemoveOAuthAppModal,
      RemoveOAuthAppModal: RemoveOAuthAppModalCallback,
    }),
    [setShowRemoveOAuthAppModal, RemoveOAuthAppModalCallback],
  );
}
