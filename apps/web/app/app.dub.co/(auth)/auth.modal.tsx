"use client";

import { LoginContent } from "@/ui/auth/login/login-content";
import { SignUpContent } from "@/ui/auth/register/signup-content";
import { ERegistrationStep } from "@/ui/auth/register/constants";
import { Modal } from "@dub/ui";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, X, XCircle } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ConsentNotice } from "./consent-notice.tsx";

export type AuthType = "login" | "signup";

export type MessageType = "success" | "error" | null;

type AuthModalProps = {
  showAuthModal: boolean;
  setShowAuthModal: Dispatch<SetStateAction<boolean>>;
  authType: AuthType;
};

export function AuthModal({
  showAuthModal,
  setShowAuthModal,
  authType,
}: AuthModalProps) {
  const handleClose = useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [registrationStep, setRegistrationStep] = useState<ERegistrationStep>(
    ERegistrationStep.SIGNUP,
  );
  console.log("[AuthModal] message", message);

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

  return (
    <Modal
      showModal={showAuthModal}
      setShowModal={setShowAuthModal}
      className="border-border-500 bg-neutral-50"
    >
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-end px-6 pb-0 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="group relative -right-2 rounded-full p-2 pb-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:right-0 md:block"
          >
            <X className="h-5 w-5" />
          </button>
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

        <div className="flex-1 overflow-y-auto p-6 pb-3 pt-0">
          {authType === "login" ? (
            <LoginContent authModal setAuthModalMessage={setAuthModalMessage} />
          ) : (
            <SignUpContent
              authModal
              setAuthModalMessage={setAuthModalMessage}
              onStepChange={updateStep}
            />
          )}
        </div>

        {authType === "signup" && registrationStep === ERegistrationStep.SIGNUP && (
          <ConsentNotice />
        )}
      </div>
    </Modal>
  );
}

export function useAuthModal() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<AuthType>("login");

  const showModal = useCallback((type: AuthType) => {
    setAuthType(type);
    setShowAuthModal(true);
  }, []);

  const AuthModalCallback = useCallback(() => {
    return (
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        authType={authType}
      />
    );
  }, [showAuthModal, setShowAuthModal, authType, setAuthType]);

  return useMemo(
    () => ({
      AuthModal: AuthModalCallback,
      showModal,
      showAuthModal,
    }),
    [AuthModalCallback, showModal, showAuthModal],
  );
}
