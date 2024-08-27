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

  const { execute, isExecuting } = useAction(submitOAuthAppForReview, {
    onSuccess: () => {
      toast.success(
        "OAuth app submitted for review. We'll be in touch shortly.",
      );
      setShowSubmitOAuthAppModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
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
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
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

        <p className="text-center text-sm text-gray-500">
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
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <TextareaAutosize
            id="message"
            name="message"
            minRows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            maxLength={1000}
          />
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0">
          <Button
            text="Cancel"
            variant="secondary"
            onClick={() => setShowSubmitOAuthAppModal(false)}
            disabled={isExecuting}
          />
          <Button
            text={isExecuting ? "Submitting..." : "Submit"}
            loading={isExecuting}
            disabled={message.trim().length === 0}
            type="submit"
          />
        </div>
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
