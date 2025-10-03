"use client";

import { LoginContent } from "@/ui/auth/login/login-content";
import { ERegistrationStep } from "@/ui/auth/register/constants";
import { SignUpContent } from "@/ui/auth/register/signup-content";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { trackClientEvents } from "core/integration/analytic/services/analytic.service.ts";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, X, XCircle } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConsentNotice } from "../../app/app.dub.co/(auth)/consent-notice.tsx";

export type AuthType = "login" | "signup";

export type MessageType = "success" | "error" | null;

type AuthModalProps = {
  sessionId: string;
  showAuthModal: boolean;
  setShowAuthModal: Dispatch<SetStateAction<boolean>>;
  authType: AuthType;
  setAuthType: Dispatch<SetStateAction<AuthType>>;
};

export function AuthModal({
  sessionId,
  showAuthModal,
  setShowAuthModal,
  authType,
  setAuthType,
}: AuthModalProps) {
  const handleClose = useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [registrationStep, setRegistrationStep] = useState<ERegistrationStep>(
    ERegistrationStep.SIGNUP,
  );

  // Track elementOpened event when modal opens
  useEffect(() => {
    if (showAuthModal) {
      trackClientEvents({
        event: EAnalyticEvents.ELEMENT_OPENED,
        params: {
          page_name: "landing",
          element_name: authType,
          event_category: "nonAuthorized",
        },
        sessionId,
      });
    }
  }, [showAuthModal, authType]);

  const setAuthModalMessage = useCallback(
    (msg: string | null, type: MessageType) => {
      setMessage(msg);
      setMessageType(type);

      if (type === "success" && msg) {
        setTimeout(() => {
          setMessage(null);
          setMessageType(null);
        }, 5000);
      }
    },
    [],
  );

  const updateStep = useCallback((step: ERegistrationStep) => {
    setRegistrationStep(step);
  }, []);

  const switchAuthType = useCallback(
    (type: AuthType) => {
      setAuthType(type);
    },
    [setAuthType],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        return;
      }
      setShowAuthModal(open);
    },
    [setShowAuthModal],
  );

  return (
    <Dialog.Root open={showAuthModal} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-100 bg-opacity-10 backdrop-blur" />
        <Dialog.Content
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
          className="border-border-500 fixed left-[50%] top-[50%] z-50 flex w-[90%] max-w-[480px] -translate-x-[50%] -translate-y-[50%] flex-col rounded-xl border bg-neutral-50 p-0 shadow-xl focus:outline-none"
        >
          <VisuallyHidden.Root>
            <Dialog.Title>
              {authType === "login"
                ? "Log in to your GetQR account"
                : "Create an account"}
            </Dialog.Title>
          </VisuallyHidden.Root>

          <div className="flex items-center justify-end px-6 pb-0 pt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={handleClose}
                className="group relative -right-2 rounded-full p-2 pb-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`mx-6 mb-2 rounded-md px-3 py-2 text-sm ${
                  messageType === "success"
                    ? "text-primary bg-primary-300 border-primary border"
                    : "border border-red-100 bg-red-50 text-red-700"
                }`}
              >
                <div className="flex items-center">
                  <div className="mr-2 flex-shrink-0">
                    {messageType === "success" ? (
                      <CheckCircle className="text-primary h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p>{message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 pb-4 pt-0">
            <AnimatePresence mode="wait">
              {authType === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoginContent
                    authModal
                    sessionId={sessionId}
                    setAuthModalMessage={setAuthModalMessage}
                    switchAuthType={switchAuthType}
                    handleClose={handleClose}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SignUpContent
                    authModal
                    sessionId={sessionId}
                    setAuthModalMessage={setAuthModalMessage}
                    onStepChange={updateStep}
                    switchAuthType={switchAuthType}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {authType === "signup" &&
              registrationStep === ERegistrationStep.SIGNUP && (
                <ConsentNotice key="consent-notice" />
              )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function useAuthModal({ sessionId }: { sessionId: string }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<AuthType>("login");

  const showModal = useCallback((type: AuthType) => {
    setAuthType(type);
    setShowAuthModal(true);
  }, []);

  const AuthModalCallback = useCallback(() => {
    return (
      <AuthModal
        sessionId={sessionId}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        authType={authType}
        setAuthType={setAuthType}
      />
    );
  }, [sessionId, showAuthModal, setShowAuthModal, authType, setAuthType]);

  return useMemo(
    () => ({
      AuthModal: AuthModalCallback,
      showModal,
    }),
    [AuthModalCallback, showModal],
  );
}
