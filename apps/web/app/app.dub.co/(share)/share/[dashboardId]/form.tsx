"use client";

import { AlertCircleFill } from "@/ui/shared/icons";
import { Button, useMediaQuery } from "@dub/ui";
import { useParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { verifyPassword } from "./action";

const initialState = {
  error: null,
};

export default function DashboardPasswordForm() {
  const { dashboardId } = useParams() as { dashboardId: string };

  const [state, formAction] = useFormState(verifyPassword, initialState);
  const { isMobile } = useMediaQuery();

  return (
    <form
      action={formAction}
      className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 sm:px-16"
    >
      <div>
        <label htmlFor="password" className="block text-xs text-neutral-600">
          PASSWORD
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <input type="hidden" name="dashboardId" value={dashboardId} />
          <input
            type="password"
            name="password"
            id="password"
            autoFocus={!isMobile}
            required
            className={`${
              state.error
                ? "border-red-300 pr-10 text-red-500 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500"
            } block w-full rounded-md focus:outline-none sm:text-sm`}
          />
          {state.error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {state.error && (
          <p className="mt-2 text-sm text-red-600" id="slug-error">
            Incorrect password
          </p>
        )}
      </div>

      <FormButton />
    </form>
  );
}

const FormButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Submit" loading={pending} />;
};
