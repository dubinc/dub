"use client";

import LoginForm from "@/ui/auth/login/login-form.tsx";
import { AuthType, MessageType } from "@/ui/modals/auth-modal.tsx";
import { cn } from "@dub/utils/src";
import { motion } from "framer-motion";
import Link from "next/link";

type LoginContentProps = {
  sessionId: string;
  authModal?: boolean;
  setAuthModalMessage?: (message: string | null, type: MessageType) => void;
  switchAuthType?: (type: AuthType) => void;
};

export function LoginContent({
  sessionId,
  authModal = false,
  setAuthModalMessage,
  switchAuthType,
}: LoginContentProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("w-full max-w-md overflow-hidden", {
          "border-border-500 border-y sm:rounded-2xl sm:border sm:shadow-sm":
            !authModal,
        })}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={cn("text-center", {
            "border-border-500 border-b bg-white pb-6 pt-8": !authModal,
          })}
        >
          <h3 className="text-lg font-semibold">
            Log in to your GetQR account
          </h3>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={cn("bg-neutral-50 px-4 py-8 sm:px-16", {
            "px-0 py-4 sm:px-0": authModal,
          })}
        >
          <LoginForm
            sessionId={sessionId}
            setAuthModalMessage={setAuthModalMessage}
            authModal={authModal}
          />
        </motion.div>
      </motion.div>
      {!authModal && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className={cn("mt-4 text-center text-sm text-neutral-500", {
            "mt-0": authModal,
          })}
        >
          Don't have an account?&nbsp;
          {authModal ? (
            <button
              onClick={() => switchAuthType && switchAuthType("signup")}
              className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
            >
              Sign up
            </button>
          ) : (
            <Link
              href="/register"
              className="hover:text-neutral font-semibold text-neutral-500 underline underline-offset-2 transition-colors"
            >
              Sign up
            </Link>
          )}
        </motion.p>
      )}
    </>
  );
}
