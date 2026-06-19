import { invitePartnerFromNetworkAction } from "@/lib/actions/partners/invite-partner-from-network";
import { generatePartnerNetworkInviteEmailAction } from "@/lib/ai/generate-partner-network-invite-email";
import { getProgramNetworkInviteEmailDefaults } from "@/lib/network/get-program-network-invite-email-defaults";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { TrustedPartnerBadge } from "@/ui/partners/trusted-partner-badge";
import { AnimatedSizeContainer, Sheet } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import { COUNTRIES, cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { UseFormRegisterReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmailContent, InviteEmailPreview } from "./invite-email-preview";
import {
  InviteSheetFooter,
  InviteSheetHeader,
  ShortLinkInput,
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
          <NetworkPartnerInviteDetails
            partner={partner}
            domain={program?.domain ?? undefined}
            selectedGroupId={watch("groupId") ?? null}
            setSelectedGroupId={(groupId) => {
              setValue("groupId", groupId, {
                shouldDirty: true,
              });
            }}
            usernameRegistration={register("username")}
          />

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

function NetworkPartnerInviteDetails({
  partner,
  domain,
  selectedGroupId,
  setSelectedGroupId,
  usernameRegistration,
}: {
  partner: NetworkPartnerProps;
  domain?: string;
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => void;
  usernameRegistration: UseFormRegisterReturn;
}) {
  const [showLinkSettings, setShowLinkSettings] = useState(false);
  const countryLabel = partner.country
    ? COUNTRIES[partner.country] ?? partner.country
    : "Planet Earth";

  return (
    <div className="mb-6 space-y-3">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="bg-neutral-50 p-4">
          <div className="flex items-center gap-4">
            <div className="relative w-fit shrink-0">
              <PartnerAvatar
                partner={partner}
                className="size-12 border border-neutral-100"
              />
              {partner.networkStatus === "trusted" && (
                <TrustedPartnerBadge size="large" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {partner.name}
              </p>
              {partner.companyName && (
                <p className="truncate text-xs text-neutral-500">
                  {partner.companyName}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-neutral-500">
                <div className="flex min-w-0 items-center gap-1.5">
                  {partner.country ? (
                    <img
                      alt={`Flag of ${countryLabel}`}
                      src={`https://flag.vercel.app/m/${partner.country}.svg`}
                      className="size-3.5 shrink-0 rounded-full"
                    />
                  ) : (
                    <Globe className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{countryLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 border-t border-neutral-200 p-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
          <label className="text-sm font-medium text-neutral-900">Group</label>
          <GroupSelector
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            buttonProps={{
              className: cn(
                "h-9 w-full justify-start border-neutral-300 px-3 transition-none",
                "data-[state=open]:border-neutral-500 data-[state=open]:ring-1 data-[state=open]:ring-neutral-500",
                "focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500",
              ),
            }}
          />
        </div>
      </div>

      <div className="flex flex-col px-3">
        <button
          type="button"
          className="flex w-fit items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          aria-expanded={showLinkSettings}
          aria-label={`${showLinkSettings ? "Hide" : "Show"} short link settings`}
          onClick={() => setShowLinkSettings((show) => !show)}
        >
          <span>
            Short Link Settings{" "}
            <span className="text-neutral-500">(optional)</span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform duration-75",
              showLinkSettings && "rotate-180",
            )}
          />
        </button>

        <AnimatedSizeContainer height className="flex flex-col">
          {showLinkSettings && (
            <div className="mt-3">
              <label htmlFor="username" className="sr-only">
                Custom short link slug
              </label>
              <ShortLinkInput
                domain={domain}
                registration={usernameRegistration}
                placeholder="custom-slug"
              />
            </div>
          )}
        </AnimatedSizeContainer>
      </div>
    </div>
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
