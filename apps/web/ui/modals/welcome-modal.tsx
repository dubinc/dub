import { Button, Logo, Modal, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

function WelcomeModal({
  showWelcomeModal,
  setShowWelcomeModal,
}: {
  showWelcomeModal: boolean;
  setShowWelcomeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showWelcomeModal}
      setShowModal={setShowWelcomeModal}
      onClose={() =>
        queryParams({
          del: "onboarded",
        })
      }
    >
      <div className="flex flex-col">
        <div className="relative h-48 w-full overflow-hidden bg-white">
          <BackgroundGradient className="opacity-15" />
          <Image
            src="/_static/onboarding/welcome-modal-background.svg"
            alt="Welcome to Dub"
            fill
            className="object-cover object-top"
          />
          <BackgroundGradient className="opacity-100 mix-blend-soft-light" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="aspect-square h-1/2 rounded-full bg-white">
              <Logo className="size-full" />
            </div>
          </div>
        </div>
        <div className="px-12 py-8">
          <h1 className="text-center text-lg font-medium text-gray-950">
            Welcome to Dub!
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Thanks for signing up &ndash; your account is ready to go! Now you
            have one central, organized place to build and manage all your short
            links.
          </p>
          <Button
            type="button"
            variant="primary"
            text="Get started"
            className="mt-8"
            onClick={() =>
              queryParams({
                del: "onboarded",
              })
            }
          />
        </div>
      </div>
    </Modal>
  );
}

export function useWelcomeModal() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const searchParams = useSearchParams();
  useEffect(
    () => setShowWelcomeModal(Boolean(searchParams?.get("onboarded"))),
    [searchParams],
  );

  const WelcomeModalCallback = useCallback(() => {
    return (
      <WelcomeModal
        showWelcomeModal={showWelcomeModal}
        setShowWelcomeModal={setShowWelcomeModal}
      />
    );
  }, [showWelcomeModal, setShowWelcomeModal]);

  return useMemo(
    () => ({
      setShowWelcomeModal,
      WelcomeModal: WelcomeModalCallback,
    }),
    [setShowWelcomeModal, WelcomeModalCallback],
  );
}

function BackgroundGradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 aspect-square w-full overflow-hidden sm:aspect-[2/1]",
        "[mask-image:radial-gradient(70%_100%_at_50%_30%,_black_70%,_#0009)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 saturate-150"
        style={{
          backgroundImage: `conic-gradient(from -25deg at 65% -10%, #3A8BFD 0deg, #FF0000 172.98deg, #855AFC 215.14deg, #FF7B00 257.32deg, #3A8BFD 360deg)`,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[50px]" />
    </div>
  );
}
