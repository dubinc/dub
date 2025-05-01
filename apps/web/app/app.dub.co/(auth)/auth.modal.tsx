"use client";

import { LoginContent } from "@/ui/auth/login/login-content";
import { SignUpContent } from "@/ui/auth/register/signup-content";
import { X } from "@/ui/shared/icons";
import { Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ConsentNotice } from "./consent-notice.tsx";

export type AuthType = "login" | "signup";

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

        <div className="flex-1 overflow-y-auto p-6 pb-3 pt-0">
          {authType === "login" ? (
            <LoginContent authModal />
          ) : (
            <SignUpContent authModal />
          )}
        </div>

        {authType === "signup" && <ConsentNotice />}
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
