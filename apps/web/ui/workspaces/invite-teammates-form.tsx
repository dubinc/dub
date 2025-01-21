import useWorkspace from "@/lib/swr/use-workspace";
import { Role, roles } from "@/lib/types";
import { Invite } from "@/lib/zod/schemas/invites";
import { Button, useMediaQuery } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { capitalize, cn, pluralize } from "@dub/utils";
import { Plus } from "lucide-react";
import posthog from "posthog-js";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { CheckCircleFill } from "../shared/icons";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";

type FormData = {
  teammates: {
    email: string;
    role: Role;
  }[];
};

export function InviteTeammatesForm({
  onSuccess,
  saveOnly = false,
  invites = [],
  className,
}: {
  onSuccess?: () => void;
  saveOnly?: boolean; // Whether to only save the data without actually sending invites
  invites?: Invite[];
  className?: string;
}) {
  const { id, slug } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const maxTeammates = saveOnly ? 4 : 10;

  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    defaultValues: {
      teammates: invites.length ? invites : [{ email: "", role: "member" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    name: "teammates",
    control: control,
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const teammates = data.teammates.filter(({ email }) => email);
        const res = await fetch(
          `/api/workspaces/${id}/invites${saveOnly ? "/saved" : ""}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teammates }),
          },
        );

        if (res.ok) {
          await mutate(`/api/workspaces/${id}/invites`);

          if (saveOnly) {
            toast.custom(
              () => <InviteSavedToast teammates={teammates.length} />,
              { duration: 7000 },
            );
          } else {
            toast.success(`${pluralize("Invitation", teammates.length)} sent!`);

            teammates.forEach(({ email }) =>
              posthog.capture("teammate_invited", {
                workspace: slug,
                invitee_email: email,
              }),
            );
          }
          onSuccess?.();
        } else {
          const { error } = await res.json();
          if (error.message.includes("upgrade")) {
            toast.custom(
              () => (
                <UpgradeRequiredToast
                  title="Upgrade required"
                  message="You've reached the invite limit for your plan. Please upgrade to invite more teammates."
                />
              ),
              { duration: 4000 },
            );
          } else {
            toast.error(error.message);
          }
          throw error;
        }
      })}
      className={cn("flex flex-col gap-8 text-left", className)}
    >
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div key={field.id} className="relative">
            <label>
              {index === 0 && (
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  {pluralize("Email", fields.length)}
                </span>
              )}
              <div className="relative flex rounded-md shadow-sm">
                <input
                  type="email"
                  placeholder="panic@thedis.co"
                  autoFocus={index === 0 && !isMobile}
                  autoComplete="off"
                  className="z-10 block w-full rounded-l-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  {...register(`teammates.${index}.email`, {
                    required: index === 0,
                  })}
                />
                <select
                  {...register(`teammates.${index}.role`, {
                    required: index === 0,
                  })}
                  defaultValue="member"
                  className="rounded-r-md border border-l-0 border-gray-300 bg-white pl-4 pr-8 text-gray-600 focus:border-gray-300 focus:outline-none focus:ring-0 sm:text-sm"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {capitalize(role)}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            {index > 0 && (
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full">
                <Button
                  variant="outline"
                  icon={<Trash className="size-4" />}
                  className="h-8 px-1"
                  onClick={() => remove(index)}
                />
              </div>
            )}
          </div>
        ))}
        <Button
          className="h-9 w-fit"
          variant="secondary"
          icon={<Plus className="size-4" />}
          text="Add email"
          onClick={() => append({ email: "", role: "member" })}
          disabled={fields.length >= maxTeammates}
        />
      </div>
      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text={
          saveOnly ? "Continue" : `Send ${pluralize("invite", fields.length)}`
        }
      />
    </form>
  );
}

function InviteSavedToast({ teammates }: { teammates: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white p-4 text-sm shadow-[0_4px_12px_#0000001a]">
      <CheckCircleFill className="size-5 shrink-0 text-black" />
      <p className="text-[13px] font-medium text-gray-900">
        {pluralize("Invitation", teammates)} saved. You'll need a pro plan to
        invite teammates.{" "}
        <a
          href="https://dub.co/help/article/how-to-invite-teammates"
          target="_blank"
          className="text-gray-500 underline transition-colors hover:text-gray-800"
        >
          Learn more
        </a>
      </p>
    </div>
  );
}
