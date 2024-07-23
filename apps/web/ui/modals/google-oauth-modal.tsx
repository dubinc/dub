import { Button, Google, Logo, Modal } from "@dub/ui";
import Cookies from "js-cookie";
import { signIn } from "next-auth/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function GoogleOauthModal({
  showGoogleOauthModal,
  setShowGoogleOauthModal,
}: {
  showGoogleOauthModal: boolean;
  setShowGoogleOauthModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [clickedGoogle, setClickedGoogle] = useState(false);

  return (
    <Modal
      showModal={showGoogleOauthModal}
      setShowModal={setShowGoogleOauthModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Connect your Google Account</h3>
        <p className="text-center text-sm text-gray-500">
          This allows you to sign in to your {process.env.NEXT_PUBLIC_APP_NAME}{" "}
          account with Google.{" "}
          <a
            className="underline underline-offset-4 transition-colors hover:text-black"
            href="https://dub.co/changelog/sign-in-with-google"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the announcement.
          </a>
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <Button
          text="Connect Google Account"
          onClick={() => {
            setClickedGoogle(true);
            signIn("google", {
              callbackUrl: "/account/settings?google=true",
            });
          }}
          loading={clickedGoogle}
          icon={<Google className="h-4 w-4" />}
        />
        <button
          onClick={() => {
            setShowGoogleOauthModal(false);
            Cookies.set("hideGoogleOauthModal", true, { expires: 14 });
          }}
          className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-800 active:text-gray-400"
        >
          Don't show this again
        </button>
      </div>
    </Modal>
  );
}

export function useGoogleOauthModal() {
  const [showGoogleOauthModal, setShowGoogleOauthModal] = useState(false);

  const GoogleOauthModalCallback = useCallback(() => {
    return (
      <GoogleOauthModal
        showGoogleOauthModal={showGoogleOauthModal}
        setShowGoogleOauthModal={setShowGoogleOauthModal}
      />
    );
  }, [showGoogleOauthModal, setShowGoogleOauthModal]);

  return useMemo(
    () => ({
      setShowGoogleOauthModal,
      GoogleOauthModal: GoogleOauthModalCallback,
    }),
    [setShowGoogleOauthModal, GoogleOauthModalCallback],
  );
}
