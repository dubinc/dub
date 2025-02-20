import { submitOAuthAppForReview } from "@/lib/actions/submit-oauth-app-for-review";
import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { BlurImage, Button, Logo, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

const DEFAULT_MESSAGE =
  "Hey! I'm submitting my OAuth app for review. Please let me know if you have any questions or need more information.";

function SubmitOAuthAppModal({
  showSubmitOAuthAppModal,
  setShowSubmitOAuthAppModal,
  oAuthApp,
}: {
  showSubmitOAuthAppModal: boolean;
  setShowSubmitOAuthAppModal: Dispatch<SetStateAction<boolean>>;
  oAuthApp: Pick<OAuthAppProps, "id" | "name" | "logo" | "slug"> | undefined;
}) {
  const workspace = useWorkspace();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const { execute, isPending } = useAction(submitOAuthAppForReview, {
    onSuccess: () => {
      toast.success(
        "OAuth app submitted for review. We'll be in touch shortly.",
      );
      setShowSubmitOAuthAppModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  if (!oAuthApp) {
    return null;
  }

  return (
    <Modal
      showModal={showSubmitOAuthAppModal}
      setShowModal={setShowSubmitOAuthAppModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        {oAuthApp.logo ? (
          <BlurImage
            src={oAuthApp.logo}
            alt={oAuthApp.name}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}

        <h3 className="text-lg font-medium">
          Submit {oAuthApp.name} for review
        </h3>

        <p className="text-center text-sm text-neutral-500">
          Please provide any additional information or comments for us to review
          your app.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();

          execute({
            message,
            integrationId: oAuthApp.id,
            workspaceId: workspace.id!,
          });
        }}
        className="flex flex-col gap-4 bg-neutral-50 px-4 pb-8 pt-6 text-left sm:px-16"
      >
        <TextareaAutosize
          id="message"
          name="message"
          minRows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm"
          maxLength={1000}
        />
        <Button
          text={isPending ? "Submitting..." : "Submit"}
          loading={isPending}
          disabled={message.trim().length === 0}
          type="submit"
        />
      </form>
    </Modal>
  );
}

export function useSubmitOAuthAppModal({
  oAuthApp,
}: {
  oAuthApp: Pick<OAuthAppProps, "id" | "name" | "logo" | "slug"> | undefined;
}) {
  const [showSubmitOAuthAppModal, setShowSubmitOAuthAppModal] = useState(false);

  const SubmitOAuthAppModalCallback = useCallback(() => {
    return (
      <SubmitOAuthAppModal
        showSubmitOAuthAppModal={showSubmitOAuthAppModal}
        setShowSubmitOAuthAppModal={setShowSubmitOAuthAppModal}
        oAuthApp={oAuthApp}
      />
    );
  }, [showSubmitOAuthAppModal, setShowSubmitOAuthAppModal, oAuthApp]);

  return useMemo(
    () => ({
      setShowSubmitOAuthAppModal,
      SubmitOAuthAppModal: SubmitOAuthAppModalCallback,
    }),
    [setShowSubmitOAuthAppModal, SubmitOAuthAppModalCallback],
  );
}
