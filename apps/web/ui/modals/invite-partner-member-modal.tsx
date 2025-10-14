import { MAX_INVITES_PER_REQUEST } from "@/lib/partners/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { invitePartnerMemberSchema } from "@/lib/zod/schemas/partner-profile";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { capitalize, pluralize } from "@dub/utils";
import { Plus } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = {
  invites: z.infer<typeof invitePartnerMemberSchema>[];
};

function InvitePartnerMemberModal({
  showInvitePartnerMemberModal,
  setShowInvitePartnerMemberModal,
}: {
  showInvitePartnerMemberModal: boolean;
  setShowInvitePartnerMemberModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();
  const { partner } = usePartnerProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      invites: [{ email: "", role: "member" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "invites",
    control,
  });

  const onSubmit = async (data: FormData) => {
    const invites = data.invites.filter(({ email }) => email.trim());
    setIsSubmitting(true);

    try {
      if (invites.length === 0) {
        throw new Error("Please enter at least one email address.");
      }

      const response = await fetch("/api/partner-profile/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invites),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      await mutatePrefix("/api/partner-profile/users");
      toast.success(
        `${pluralize("Invitation", invites.length)} sent successfully!`,
      );
      setShowInvitePartnerMemberModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to send invitations.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showInvitePartnerMemberModal}
      setShowModal={setShowInvitePartnerMemberModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Invite Partner Members</h3>
        <p className="text-sm text-neutral-500">
          Invite team members to{" "}
          <span className="font-semibold text-black">{partner?.name}</span>.
          Invitations will be valid for 14 days.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 bg-neutral-50 px-4 py-4 sm:px-6"
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">
            {pluralize("Email", fields.length)}
          </span>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1">
                <div className="flex rounded-md shadow-sm">
                  <input
                    type="email"
                    placeholder="panic@thedis.co"
                    autoFocus={index === 0 && !isMobile}
                    autoComplete="off"
                    className="flex-1 rounded-l-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    {...register(`invites.${index}.email`, {
                      required: index === 0,
                    })}
                  />
                  <select
                    {...register(`invites.${index}.role`, {
                      required: index === 0,
                    })}
                    defaultValue="member"
                    className="rounded-r-md border border-l-0 border-neutral-300 bg-white pl-4 pr-8 text-neutral-600 focus:border-neutral-300 focus:outline-none focus:ring-0 sm:text-sm"
                  >
                    {["owner", "member"].map((role) => (
                      <option key={role} value={role}>
                        {capitalize(role)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {index > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  icon={<Trash className="size-4" />}
                  className="h-10 w-10 shrink-0 p-0"
                  onClick={() => remove(index)}
                />
              )}
            </div>
          ))}

          <Button
            type="button"
            className="h-9 w-fit"
            variant="secondary"
            icon={<Plus className="size-4" />}
            text="Add email"
            onClick={() => append({ email: "", role: "member" })}
            disabled={fields.length >= MAX_INVITES_PER_REQUEST}
          />
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          text={`Send ${pluralize("invite", fields.length)}`}
        />
      </form>
    </Modal>
  );
}

export function useInvitePartnerMemberModal() {
  const [showInvitePartnerMemberModal, setShowInvitePartnerMemberModal] =
    useState(false);

  const InvitePartnerMemberModalCallback = useCallback(() => {
    return (
      <InvitePartnerMemberModal
        showInvitePartnerMemberModal={showInvitePartnerMemberModal}
        setShowInvitePartnerMemberModal={setShowInvitePartnerMemberModal}
      />
    );
  }, [showInvitePartnerMemberModal, setShowInvitePartnerMemberModal]);

  return useMemo(
    () => ({
      setShowInvitePartnerMemberModal,
      InvitePartnerMemberModal: InvitePartnerMemberModalCallback,
    }),
    [setShowInvitePartnerMemberModal, InvitePartnerMemberModalCallback],
  );
}
