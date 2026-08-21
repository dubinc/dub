import { parseActionError } from "@/lib/actions/parse-action-errors";
import { bulkInvitePartnersAction } from "@/lib/actions/partners/bulk-invite-partners";
import { invitePartnerAction } from "@/lib/actions/partners/invite-partner";
import { saveInviteEmailDataAction } from "@/lib/actions/partners/save-invite-email-data";
import { MAX_PARTNERS_INVITES_PER_REQUEST } from "@/lib/constants/program";
import { useEmailDomains } from "@/lib/swr/use-email-domains";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramInviteEmailData, ProgramProps } from "@/lib/types";
import {
  bulkInvitePartnersSchema,
  invitePartnerSchema,
} from "@/lib/zod/schemas/partners";
import {
  AnimatedSizeContainer,
  MultiValueInput,
  type MultiValueInputRef,
  Sheet,
  useMediaQuery,
} from "@dub/ui";
import { pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmailContent, InviteEmailPreview } from "./invite-email-preview";
import {
  GroupField,
  InviteSheetFooter,
  InviteSheetHeader,
  ShortLinkField,
} from "./invite-sheet-ui";

interface InvitePartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type InvitePartnerFormData = {
  email: string;
  emails: string[];
  name?: string;
  username?: string;
  groupId: string | null;
};

function InvitePartnerSheetContent({ setIsOpen }: InvitePartnerSheetProps) {
  const { program, mutate } = useProgram<
    ProgramProps & { inviteEmailData: ProgramInviteEmailData }
  >(undefined, {
    keepPreviousData: true, // so the mutate doesn't cause a full page refresh
  });
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const { verifiedEmailDomain } = useEmailDomains();

  // Default email content
  const defaultEmailContent = useMemo<EmailContent>(() => {
    const programName = program?.name || "Dub";

    return {
      subject: `${programName} invited you to join Dub Partners`,
      title: "You've been invited",
      body: `${programName} invited you to join their program on Dub Partners.\n\n${programName} uses [Dub Partners](https://dub.co/partners) to power their partner program and wants to work with great people like you!`,
    };
  }, [program?.name]);

  // Load saved email content from program
  const savedEmailContent = useMemo<EmailContent | null>(
    () =>
      program?.inviteEmailData
        ? {
            subject: program.inviteEmailData.subject,
            title: program.inviteEmailData.title,
            body: program.inviteEmailData.body,
          }
        : null,
    [program?.inviteEmailData],
  );

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(
    savedEmailContent,
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue,
  } = useForm<InvitePartnerFormData>({
    defaultValues: {
      email: "",
      emails: [],
      groupId: program?.defaultGroupId || "",
    },
  });

  const multiValueInputRef = useRef<MultiValueInputRef>(null);
  const emails = watch("emails") ?? [];
  const hasMultipleRecipients = emails.length > 1;

  const { executeAsync: invitePartner, isPending } = useAction(
    invitePartnerAction,
    {
      onSuccess: () => {
        toast.success("Invitation sent to partner!");
        setIsOpen(false);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const { executeAsync: bulkInvitePartners, isPending: isBulkPending } =
    useAction(bulkInvitePartnersAction, {
      onSuccess: ({ data: { invitedCount, skippedCount } }) => {
        const parts: string[] = [];

        if (invitedCount > 0) {
          parts.push(
            `${pluralize("Invitation", invitedCount)} sent to ${invitedCount} ${pluralize("partner", invitedCount)}.`,
          );
        }

        if (skippedCount > 0) {
          parts.push(
            `Skipped ${skippedCount} ${pluralize("partner", skippedCount)} because they're already enrolled or previously invited.`,
          );
        }

        toast.success(parts.join(" "));
        setIsOpen(false);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: saveEmailDataAsync, isPending: isSavingEmailData } =
    useAction(saveInviteEmailDataAction, {
      onSuccess: () => {
        toast.success("Email template saved!");
      },
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to save email template"));
      },
    });

  const onSubmit = async (data: InvitePartnerFormData) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const finalEmails =
      multiValueInputRef.current?.commitPendingInput() ?? data.emails ?? [];

    if (finalEmails.length === 0) {
      toast.error("Please enter at least one email address.");
      return;
    }

    if (finalEmails.length === 1) {
      const parsed = invitePartnerSchema.safeParse({
        workspaceId,
        email: finalEmails[0],
        name: data.name,
        username: data.username,
        groupId: data.groupId ?? null,
      });

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
        return;
      }

      await invitePartner(parsed.data);
      return;
    }

    const parsed = bulkInvitePartnersSchema.safeParse({
      workspaceId,
      emails: finalEmails,
      groupId: data.groupId ?? null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    await bulkInvitePartners(parsed.data);
  };

  // Persists the customized email to the program for reuse across invites
  const handleSaveEmail = async (content: EmailContent) => {
    if (!workspaceId) {
      return false;
    }

    let result: Awaited<ReturnType<typeof saveEmailDataAsync>>;

    try {
      result = await saveEmailDataAsync({
        workspaceId,
        subject: content.subject,
        title: content.title,
        body: content.body,
      });
    } catch {
      return false;
    }

    if (result?.serverError || result?.validationErrors) {
      return false;
    }

    setEmailContent(content);
    mutate();
    return true;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <InviteSheetHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="partner-email-input"
                className="block text-sm font-medium text-neutral-900"
              >
                Email
              </label>

              <div className="mt-2">
                <MultiValueInput
                  ref={multiValueInputRef}
                  id="partner-email-input"
                  values={emails}
                  onChange={(values) => {
                    setValue("emails", values, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue("email", values[0] ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  placeholder="panic@thedis.co"
                  normalize={(v) => v.trim().toLowerCase()}
                  maxValues={MAX_PARTNERS_INVITES_PER_REQUEST}
                  disabled={isEditingEmail || isSavingEmailData}
                  autoFocus={!isMobile}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Separate multiple emails with commas, or paste a list
              </p>
            </div>

            <div>
              <AnimatedSizeContainer
                height
                className="overflow-visible"
                transition={{ ease: "easeOut", duration: 0.35 }}
              >
                {!hasMultipleRecipients && (
                  <div className="grid grid-cols-1 gap-6 pb-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-neutral-900"
                      >
                        Name{" "}
                        <span className="text-neutral-500">(optional)</span>
                      </label>

                      <div className="relative mt-2 rounded-md shadow-sm">
                        <input
                          {...register("name")}
                          className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                          placeholder="John Doe"
                          type="text"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <ShortLinkField
                      domain={program?.domain ?? undefined}
                      registration={register("username")}
                    />
                  </div>
                )}
              </AnimatedSizeContainer>
              <GroupField
                optional
                selectedGroupId={watch("groupId")}
                setSelectedGroupId={(groupId) => {
                  setValue("groupId", groupId, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </div>

          <InviteEmailPreview
            emailContent={emailContent || defaultEmailContent}
            defaultEmailContent={defaultEmailContent}
            fromAddress={
              verifiedEmailDomain
                ? `partners@${verifiedEmailDomain.slug}`
                : "notifications@mail.dub.co"
            }
            onSave={handleSaveEmail}
            onEditingChange={setIsEditingEmail}
            isSaving={isSavingEmailData}
          />
        </div>
      </div>

      <InviteSheetFooter
        onCancel={() => setIsOpen(false)}
        isPending={isPending || isBulkPending}
        isSubmitting={isSubmitting}
        isSubmitDisabled={isEditingEmail || isSavingEmailData}
      />
    </form>
  );
}

export function InvitePartnerSheet({
  isOpen,
  ...rest
}: InvitePartnerSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <InvitePartnerSheetContent {...rest} />
    </Sheet>
  );
}

export function useInvitePartnerSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    invitePartnerSheet: (
      <InvitePartnerSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
