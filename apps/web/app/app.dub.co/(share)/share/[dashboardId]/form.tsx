"use client";

import { Button, Input, useMediaQuery } from "@dub/ui";
import { useParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verifyPassword } from "./action";

const initialState = {
  error: null,
};

export default function DashboardPasswordForm() {
  const { dashboardId } = useParams() as { dashboardId: string };

  const [state, formAction] = useActionState(verifyPassword, initialState);
  const { isMobile } = useMediaQuery();

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <input type="hidden" name="dashboardId" value={dashboardId} />
      <label>
        <span className="text-content-emphasis mb-2 block text-sm font-medium leading-none">
          Password
        </span>
        <Input
          type="password"
          name="password"
          autoFocus={!isMobile}
          autoComplete="current-password"
          required
          error={state.error ? "Incorrect password" : undefined}
        />
      </label>

      <FormButton />
    </form>
  );
}

const FormButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Submit" loading={pending} />;
};
