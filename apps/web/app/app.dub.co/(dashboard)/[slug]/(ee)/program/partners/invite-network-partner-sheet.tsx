import { invitePartnerFromNetworkAction } from "@/lib/actions/partners/invite-partner-from-network";
import { generatePartnerNetworkInviteEmailAction } from "@/lib/ai/generate-partner-network-invite-email";
import { getProgramNetworkInviteEmailDefaults } from "@/lib/network/get-program-network-invite-email-defaults";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Sheet } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmailContent, InviteEmailPreview } from "./invite-email-preview";
import {
  GroupField,
  InviteSheetFooter,
  InviteSheetHeader,
  ShortLinkField,
} from "./invite-sheet-ui";

interface InviteNetworkPartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partner: NetworkPartnerProps;
  groupId?: string | null;
  // Customized email content is owned by the parent so it survives the sheet
  // being closed and reopened (it's never persisted to the server)
  emailContent?: EmailContent | null;
  onEmailContentChange?: (content: EmailContent | null) => void;
  onSuccess: () => void;
  onInviteLimitError?: () => void;
}

type InviteNetworkPartnerFormData = {
  username?: string;
  groupId: string | null;
};

function InviteNetworkPartnerSheetContent({
  setIsOpen,
  partner,
  groupId,
  emailContent: initialEmailContent,
  onEmailContentChange,
  onSuccess,
  onInviteLimitError,
}: InviteNetworkPartnerSheetProps) {
  const { program } = useProgram();
  const {
    exceededAI,
    id: workspaceId,
    mutate: mutateWorkspace,
  } = useWorkspace();

  const defaultEmailContent = useMemo<EmailContent>(() => {
    return getProgramNetworkInviteEmailDefaults({
      programName: program?.name || "Dub",
      partnerName: partner.name,
    });
  }, [program?.name, partner.name]);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(
    initialEmailContent ?? null,
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue,
  } = useForm<InviteNetworkPartnerFormData>({
    defaultValues: {
      groupId: groupId ?? program?.defaultGroupId ?? undefined,
    },
  });

  const { executeAsync: invitePartnerFromNetwork, isPending } = useAction(
    invitePartnerFromNetworkAction,
    {
      onSuccess: () => {
        toast.success("Invitation sent to partner!");
        setIsOpen(false);
        onSuccess();
      },
      onError({ error }) {
        const message = String(error.serverError ?? "");

        if (
          onInviteLimitError &&
          message.toLowerCase().includes("invitations limit")
        ) {
          onInviteLimitError();
          return;
        }

        toast.error(message || "Failed to send invite.");
      },
    },
  );

  const {
    executeAsync: generatePartnerNetworkInviteEmail,
    isPending: isGeneratingEmail,
  } = useAction(generatePartnerNetworkInviteEmailAction, {
    onError({ error }) {
      toast.error(error.serverError || "Failed to personalize invite.");
    },
  });

  const onSubmit = async (data: InviteNetworkPartnerFormData) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const normalizedGroupId =
      data.groupId && data.groupId !== "" ? data.groupId : null;

    await invitePartnerFromNetwork({
      workspaceId,
      partnerId: partner.id,
      groupId: normalizedGroupId,
      username: data.username?.trim() || undefined,
      // Only override the email if the user customized it
      ...(emailContent && {
        emailSubject: emailContent.subject,
        emailTitle: emailContent.title,
        emailBody: emailContent.body,
      }),
    });
  };

  // The email is customized per-invite, so it's kept in state (and mirrored
  // to the parent) instead of being persisted to the server
  const handleSaveEmail = (content: EmailContent) => {
    setEmailContent(content);
    onEmailContentChange?.(content);
    return true;
  };

  const handleResetEmail = () => {
    setEmailContent(null);
    onEmailContentChange?.(null);
  };

  const handleGenerateEmail = async ({
    applyGeneratedEmail = true,
  }: {
    applyGeneratedEmail?: boolean;
  } = {}) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    // Failures (thrown or returned) are toasted by the action's onError handler
    const result = await generatePartnerNetworkInviteEmail({
      workspaceId,
      partnerId: partner.id,
    }).catch(() => null);

    if (!result?.data) {
      return;
    }

    if (applyGeneratedEmail) {
      setEmailContent(result.data);
      onEmailContentChange?.(result.data);
    }

    // Refresh AI usage so exceededAI reflects the credit we just spent
    mutateWorkspace();

    toast.success("Invite personalized.");

    return result.data;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <InviteSheetHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <PartnerAvatar partner={partner} className="size-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">
                  {partner.name}
                </p>
                {partner.companyName && (
                  <p className="truncate text-xs text-neutral-500">
                    {partner.companyName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <GroupField
                selectedGroupId={watch("groupId")}
                setSelectedGroupId={(groupId) => {
                  setValue("groupId", groupId, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>

            <ShortLinkField
              domain={program?.domain ?? undefined}
              registration={register("username")}
            />
          </div>

          <InviteEmailPreview
            emailContent={emailContent || defaultEmailContent}
            defaultEmailContent={defaultEmailContent}
            // Network invites are always sent from the default address
            fromAddress="notifications@mail.dub.co"
            onSave={handleSaveEmail}
            onGenerate={handleGenerateEmail}
            onReset={handleResetEmail}
            onEditingChange={setIsEditingEmail}
            isGenerating={isGeneratingEmail}
            showReset={Boolean(emailContent)}
            generationAvatar={
              <PartnerAvatar partner={partner} className="size-16 shrink-0" />
            }
            generateDisabledTooltip={
              exceededAI ? "You've exceeded your AI usage limit." : undefined
            }
          />
        </div>
      </div>

      <InviteSheetFooter
        onCancel={() => setIsOpen(false)}
        isPending={isPending}
        isSubmitting={isSubmitting}
        isSubmitDisabled={isEditingEmail || isGeneratingEmail}
      />
    </form>
  );
}

export function InviteNetworkPartnerSheet({
  isOpen,
  nested,
  ...rest
}: InviteNetworkPartnerSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <InviteNetworkPartnerSheetContent {...rest} />
    </Sheet>
  );
}
