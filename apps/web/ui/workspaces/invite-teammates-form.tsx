import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  getAvailableRolesForPlan,
  WORKSPACE_ROLES,
} from "@/lib/workspace-roles";
import { Invite } from "@/lib/zod/schemas/invites";
import { WorkspaceRole } from "@dub/prisma/client";
import { Button, useMediaQuery, useRouterStuff } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn, pluralize } from "@dub/utils";
import { Plus } from "lucide-react";
import posthog from "posthog-js";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";

type FormData = {
  teammates: {
    email: string;
    role: WorkspaceRole;
  }[];
};

export function InviteTeammatesForm({
  onSuccess,
  invites = [],
  className,
}: {
  onSuccess?: () => void;
  invites?: Invite[];
  className?: string;
}) {
  const { id, slug, plan, usersLimit } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const { queryParams } = useRouterStuff();

  const availableRolesForPlan = useMemo(() => {
    return getAvailableRolesForPlan(plan);
  }, [plan]);

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
        const res = await fetch(`/api/workspaces/${id}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teammates }),
        });

        if (res.ok) {
          await mutatePrefix(`/api/workspaces/${id}/invites`);

          toast.success(`${pluralize("Invitation", teammates.length)} sent!`);
          queryParams({
            set: {
              status: "invited",
            },
          });

          teammates.forEach(({ email }) =>
            posthog.capture("teammate_invited", {
              workspace: slug,
              invitee_email: email,
            }),
          );
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
                <span className="mb-2 block text-sm font-medium text-neutral-700">
                  {pluralize("Email", fields.length)}
                </span>
              )}
              <div className="relative flex rounded-md shadow-sm">
                <input
                  type="email"
                  placeholder="panic@thedis.co"
                  autoFocus={index === 0 && !isMobile}
                  autoComplete="off"
                  className="z-10 block w-full rounded-l-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register(`teammates.${index}.email`, {
                    required: index === 0,
                  })}
                />
                <select
                  {...register(`teammates.${index}.role`, {
                    required: index === 0,
                  })}
                  defaultValue="member"
                  className="rounded-r-md border border-l-0 border-neutral-300 bg-white pl-4 pr-8 text-neutral-600 focus:border-neutral-300 focus:outline-none focus:ring-0 sm:text-sm"
                >
                  {WORKSPACE_ROLES.map(({ value, label }) => {
                    return (
                      <option
                        key={value}
                        value={value}
                        disabled={!availableRolesForPlan.includes(value)}
                      >
                        {label}
                      </option>
                    );
                  })}
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
          disabled={fields.length >= (usersLimit || Infinity)}
        />
      </div>
      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text={`Send ${pluralize("invite", fields.length)}`}
      />
    </form>
  );
}
