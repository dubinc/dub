import useWorkspace from "@/lib/swr/use-workspace";
import { Button, useMediaQuery } from "@dub/ui";
import { Trash } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { Plus } from "lucide-react";
import posthog from "posthog-js";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

type FormData = {
  teammates: {
    email: string;
  }[];
};

export function InviteTeammatesForm({
  onSuccess,
  className,
}: {
  onSuccess?: () => void;
  className?: string;
}) {
  const { id, slug } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    defaultValues: {
      teammates: [{ email: "" }],
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
          await mutate(`/api/workspaces/${id}/invites`);
          toast.success(`Invitation${teammates.length !== 1 ? "s" : ""} sent!`);
          teammates.forEach(({ email }) =>
            posthog.capture("teammate_invited", {
              workspace: slug,
              invitee_email: email,
            }),
          );
          onSuccess?.();
        } else {
          const { error } = await res.json();
          toast.error(error.message);
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
                  Email{fields.length !== 1 ? "s" : ""}
                </span>
              )}
              <div className="relative rounded-md shadow-sm">
                <input
                  type="email"
                  placeholder="panic@thedis.co"
                  autoFocus={index === 0 && !isMobile}
                  autoComplete="off"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  {...register(`teammates.${index}.email`, {
                    required: index === 0,
                  })}
                />
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
          onClick={() => append({ email: "" })}
          disabled={fields.length >= 10}
        />
      </div>
      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text={`Send invite${fields.length !== 1 ? "s" : ""}`}
      />
    </form>
  );
}
