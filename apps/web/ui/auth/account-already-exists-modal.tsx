"use client";

import {
  ACCOUNT_EXISTS_EMAIL_COOKIE,
  ACCOUNT_NOT_LINKED_ERRORS,
  getAuthProviderLabel,
} from "@/lib/better-auth/account-linking";
import { parseEmail } from "@/lib/zod/schemas/auth";
import { Button, Logo, Modal } from "@dub/ui";
import Cookies from "js-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AccountAlreadyExistsModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  const error = searchParams?.get("error");
  const provider = searchParams?.get("provider") ?? "github";
  const emailFromQuery = parseEmail(searchParams?.get("email"));

  const email = useMemo(() => {
    if (emailFromQuery) {
      return emailFromQuery;
    }

    const fromDescription = parseEmail(searchParams?.get("error_description"));
    if (fromDescription) {
      return fromDescription;
    }

    return parseEmail(Cookies.get(ACCOUNT_EXISTS_EMAIL_COOKIE));
  }, [emailFromQuery, searchParams]);

  useEffect(() => {
    if (error && ACCOUNT_NOT_LINKED_ERRORS.has(error)) {
      setShowModal(true);
    }
  }, [error]);

  const providerLabel = getAuthProviderLabel(provider);

  const handleSignIn = () => {
    Cookies.remove(ACCOUNT_EXISTS_EMAIL_COOKIE);

    const params = new URLSearchParams();
    if (email) {
      params.set("email", email);
    }

    const query = params.toString();
    router.push(query ? `/login?${query}` : "/login");
    setShowModal(false);
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">An account already exists</h3>
        <p className="text-center text-sm text-neutral-500">
          {email
            ? `We found an existing account with ${email}.`
            : "We found an existing account with this email."}{" "}
          To connect {providerLabel} to this account, sign in with your existing
          password.
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <Button text="Sign in" onClick={handleSignIn} />
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="text-sm text-neutral-400 underline underline-offset-4 transition-colors hover:text-neutral-800 active:text-neutral-400"
        >
          Dismiss
        </button>
      </div>
    </Modal>
  );
}
