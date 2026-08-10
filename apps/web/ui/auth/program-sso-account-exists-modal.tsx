"use client";

import { Button, Logo, Modal } from "@dub/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ProgramSsoAccountExistsModal({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const error = searchParams?.get("error");
    if (
      error === "account_not_linked" ||
      error === "unable_to_link_account" ||
      error === "OAuthAccountNotLinked"
    ) {
      setShowModal(true);
    }
  }, [searchParams]);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">
          You already have a Dub Partners account
        </h3>
        <p className="text-center text-sm text-neutral-500">
          Sign in with your existing email, password, or Google, then connect{" "}
          {name} to keep using Login with {name}.
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <Button
          text="Sign in to connect"
          onClick={() => {
            router.push(`/login?connect=${slug}`);
          }}
        />
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
