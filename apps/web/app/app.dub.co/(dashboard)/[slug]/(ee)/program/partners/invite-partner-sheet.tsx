import { parseActionError } from "@/lib/actions/parse-action-errors";
import { invitePartnerAction } from "@/lib/actions/partners/invite-partner";
import { saveInviteEmailDataAction } from "@/lib/actions/partners/save-invite-email-data";
import { useEmailDomains } from "@/lib/swr/use-email-domains";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramInviteEmailData, ProgramProps } from "@/lib/types";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  BlurImage,
  Button,
  InfoTooltip,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  Sheet,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

interface InvitePartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type InvitePartnerFormData = z.infer<typeof invitePartnerSchema>;

type EmailContent = {
  subject: string;
  title: string;
  body: string;
};

const invitePartnerEmailSchema = z.email().trim().min(1).max(100);

function InvitePartnerSheetContent({ setIsOpen }: InvitePartnerSheetProps) {
  const { program, mutate } = useProgram<
    ProgramProps & { inviteEmailData: ProgramInviteEmailData }
  >(undefined, {
    keepPreviousData: true, // so the mutate doesn't cause a full page refresh
  });
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();

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
  const savedEmailContent = useMemo<EmailContent | null>(() => {
    if (program?.inviteEmailData) {
      return {
        subject: program.inviteEmailData.subject,
        title: program.inviteEmailData.title,
        body: program.inviteEmailData.body,
      };
    }
    return null;
  }, [program?.inviteEmailData]);

  // State for email editing
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(
    savedEmailContent,
  );
  const [draftEmailContent, setDraftEmailContent] = useState<EmailContent>(
    savedEmailContent || defaultEmailContent,
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
    watch,
    setValue,
  } = useForm<InvitePartnerFormData>({
    defaultValues: {
      email: "",
      emails: [],
      groupId: program?.defaultGroupId || "",
    },
  });

  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState<
    string | null
  >(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const [isEmailFieldWrapped, setIsEmailFieldWrapped] = useState(false);
  const hasMultipleRecipients = recipientEmails.length > 1;

  const handleEmailInputChange = (value: string) => {
    emailInputRef.current?.setCustomValidity("");
    setSelectedRecipientEmail(null);
    setEmailInput(value);
  };

  const handleEmailInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const inputElement = e.currentTarget;
    const selectedIndex = selectedRecipientEmail
      ? recipientEmails.findIndex((email) => email === selectedRecipientEmail)
      : -1;

    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commitEmailInput();
      return;
    }

    if (e.key === "ArrowLeft" && recipientEmails.length > 0) {
      // Move chip selection left from the input caret, then across chips.
      if (selectedIndex > 0) {
        e.preventDefault();
        setSelectedRecipientEmail(recipientEmails[selectedIndex - 1]);
        return;
      }

      if (
        selectedIndex === -1 &&
        inputElement.selectionStart === 0 &&
        inputElement.selectionEnd === 0
      ) {
        e.preventDefault();
        setSelectedRecipientEmail(recipientEmails[recipientEmails.length - 1]);
        return;
      }
    }

    if (e.key === "ArrowRight" && selectedIndex !== -1) {
      e.preventDefault();

      if (selectedIndex < recipientEmails.length - 1) {
        setSelectedRecipientEmail(recipientEmails[selectedIndex + 1]);
        return;
      }

      // Return to regular input cursor mode.
      setSelectedRecipientEmail(null);
      return;
    }

    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !emailInput &&
      recipientEmails.length > 0
    ) {
      e.preventDefault();

      if (selectedRecipientEmail) {
        setRecipientEmails((prev) =>
          prev.filter((email) => email !== selectedRecipientEmail),
        );
        setSelectedRecipientEmail(null);
        return;
      }

      setSelectedRecipientEmail(recipientEmails[recipientEmails.length - 1]);
    }

    if (e.key === "Tab" && selectedRecipientEmail) {
      e.preventDefault();
      setSelectedRecipientEmail(null);
    }
  };

  useEffect(() => {
    const container = emailFieldRef.current;
    if (!container) return;

    const checkWrappedState = () => {
      const children = Array.from(container.children) as HTMLElement[];

      if (children.length <= 1) {
        setIsEmailFieldWrapped(false);
        return;
      }

      const tops = children.map((el) => el.offsetTop);
      const firstRowTop = Math.min(...tops);
      const wrapped = tops.some((top) => top - firstRowTop > 2);
      setIsEmailFieldWrapped(wrapped);
    };

    checkWrappedState();

    const observer = new ResizeObserver(checkWrappedState);
    observer.observe(container);

    return () => observer.disconnect();
  }, [recipientEmails, emailInput]);

  const { executeAsync, isPending } = useAction(invitePartnerAction, {
    onSuccess: ({ data }) => {
      const invitedCount = data?.invitedCount || 1;
      toast.success(
        invitedCount > 1
          ? `Invitations sent to ${invitedCount} partners!`
          : "Invitation sent to partner!",
      );
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const { executeAsync: saveEmailDataAsync, isPending: isSavingEmailData } =
    useAction(saveInviteEmailDataAction, {
      onSuccess: async ({ input }) => {
        toast.success("Email template saved!");

        // Update local state with saved content
        const updatedContent: EmailContent = {
          subject: input.subject,
          title: input.title,
          body: input.body,
        };
        setEmailContent(updatedContent);
        setDraftEmailContent(updatedContent);
        setIsEditingEmail(false);
      },
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to save email template"));
      },
    });

  useEffect(() => {
    setValue("emails", recipientEmails, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("email", recipientEmails[0], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [recipientEmails, setValue]);

  useEffect(() => {
    if (
      selectedRecipientEmail &&
      !recipientEmails.includes(selectedRecipientEmail)
    ) {
      setSelectedRecipientEmail(null);
    }
  }, [recipientEmails, selectedRecipientEmail]);

  const addRecipientEmail = (rawValue: string) => {
    const normalizedValue = rawValue.trim().toLowerCase();

    if (!normalizedValue) {
      return true;
    }

    const parsedEmail = invitePartnerEmailSchema.safeParse(normalizedValue);

    if (!parsedEmail.success) {
      emailInputRef.current?.setCustomValidity(
        "Please enter a valid email address.",
      );
      emailInputRef.current?.reportValidity();
      return false;
    }

    setRecipientEmails((prev) => {
      if (prev.includes(normalizedValue)) {
        return prev;
      }

      return [...prev, normalizedValue];
    });
    emailInputRef.current?.setCustomValidity("");

    return true;
  };

  const commitEmailInput = () => {
    const emailCandidates = emailInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (emailCandidates.length === 0) {
      setEmailInput("");
      return true;
    }

    for (const candidate of emailCandidates) {
      const wasAdded = addRecipientEmail(candidate);

      if (!wasAdded) {
        return false;
      }
    }

    setEmailInput("");
    return true;
  };

  const onSubmit = async (data: InvitePartnerFormData) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    const didCommitPendingInput = commitEmailInput();

    if (!didCommitPendingInput) {
      return;
    }

    const finalRecipientEmails = Array.from(
      new Set([
        ...recipientEmails,
        ...emailInput
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ]),
    );

    if (finalRecipientEmails.length === 0) {
      emailInputRef.current?.setCustomValidity(
        "Please enter at least one email address.",
      );
      emailInputRef.current?.reportValidity();
      return;
    }

    await executeAsync({
      ...data,
      email: finalRecipientEmails[0],
      emails: finalRecipientEmails,
      ...(finalRecipientEmails.length > 1
        ? { name: undefined, username: undefined }
        : {}),
      workspaceId,
    });
  };

  const handleStartEditing = () => {
    setDraftEmailContent(emailContent || defaultEmailContent);
    setIsEditingEmail(true);
  };

  const handleSaveEmail = async () => {
    if (!workspaceId) {
      return;
    }

    const sanitizedSubject = draftEmailContent.subject.trim();
    const sanitizedTitle = draftEmailContent.title.trim();
    let sanitizedBody = draftEmailContent.body.trim();

    // Enforce max length validation (matches schema)
    if (sanitizedBody.length > 3000) {
      sanitizedBody = sanitizedBody.substring(0, 3000);
      toast.error("Email body was truncated to 3000 characters");
    }

    const updatedContent: EmailContent = {
      subject: sanitizedSubject || defaultEmailContent.subject,
      title: sanitizedTitle || defaultEmailContent.title,
      body: sanitizedBody || defaultEmailContent.body,
    };

    // Ensure all values are non-empty (schema requirement)
    const finalSubject =
      updatedContent.subject.trim() || defaultEmailContent.subject;
    const finalTitle = updatedContent.title.trim() || defaultEmailContent.title;
    const finalBody = updatedContent.body.trim() || defaultEmailContent.body;

    // Save to server (state updates happen in onSuccess callback)
    await saveEmailDataAsync({
      workspaceId,
      subject: finalSubject,
      title: finalTitle,
      body: finalBody,
    });
    await mutate();
  };

  const handleCancelEditing = () => {
    setDraftEmailContent(emailContent || defaultEmailContent);
    setIsEditingEmail(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="flex items-center gap-1 text-lg font-semibold">
            Invite partner{" "}
            <InfoTooltip
              content={
                "Invite influencers, affiliates, and users to your program, or enroll them automatically. [Learn more.](https://dub.co/help/article/inviting-partners)"
              }
            />
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

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

              <div
                ref={emailFieldRef}
                className={cn(
                  "relative mt-2 flex w-full flex-wrap items-center gap-1 rounded-md border border-neutral-300 bg-white px-1.5 shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                  isEmailFieldWrapped ? "py-[4px]" : "h-[38px] py-[3px]",
                )}
              >
                {recipientEmails.map((recipientEmail) => (
                  <span
                    key={recipientEmail}
                    onClick={() => setSelectedRecipientEmail(recipientEmail)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md pl-1.5 pr-1 py-0.5 text-sm leading-6",
                      selectedRecipientEmail === recipientEmail
                        ? "bg-neutral-300 text-neutral-900"
                        : "bg-neutral-100 text-neutral-900",
                    )}
                  >
                    <span>{recipientEmail}</span>
                    <Button
                      type="button"
                      variant="outline"
                      icon={<X className="size-3" strokeWidth={2.5} />}
                      onClick={() => {
                        setSelectedRecipientEmail((prev) =>
                          prev === recipientEmail ? null : prev,
                        );
                        setRecipientEmails((prev) =>
                          prev.filter((email) => email !== recipientEmail),
                        );
                      }}
                      className={cn(
                        "h-auto w-fit rounded-md p-0.5 shadow-none",
                        selectedRecipientEmail === recipientEmail
                          ? "text-neutral-600 hover:text-neutral-800"
                          : "text-neutral-500 hover:text-neutral-700",
                      )}
                    />
                  </span>
                ))}
                <div className="min-w-[8rem] flex-[1_1_8rem]">
                  <input
                    ref={emailInputRef}
                    id="partner-email-input"
                    value={emailInput}
                    onChange={(e) => handleEmailInputChange(e.target.value)}
                    onKeyDown={handleEmailInputKeyDown}
                    onBlur={() => {
                      setSelectedRecipientEmail(null);
                      commitEmailInput();
                    }}
                    className={cn(
                      "h-7 w-full border-0 bg-transparent px-1.5 text-sm leading-6 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0",
                      selectedRecipientEmail &&
                        "caret-transparent text-transparent placeholder:text-transparent",
                    )}
                    placeholder="panic@thedis.co"
                    type="text"
                    autoComplete="off"
                    autoFocus={!isMobile}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Separate multiple emails with commas
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

                    <div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="username"
                          className="block text-sm font-medium text-neutral-900"
                        >
                          Short link{" "}
                          <span className="text-neutral-500">(optional)</span>
                        </label>
                      </div>

                      <div className="mt-2 flex">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                          {program?.domain}
                        </span>
                        <input
                          {...register("username")}
                          type="text"
                          id="username"
                          className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                          placeholder="johndoe"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </AnimatedSizeContainer>
              <label className="block text-sm font-medium text-neutral-900">
                Group <span className="text-neutral-500">(optional)</span>
              </label>

              <div className="relative mt-2 rounded-md shadow-sm">
                <GroupSelector
                  selectedGroupId={watch("groupId")}
                  setSelectedGroupId={(groupId) => {
                    setValue("groupId", groupId, {
                      shouldDirty: true,
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <EmailPreview
            isEditingEmail={isEditingEmail}
            emailContent={emailContent || defaultEmailContent}
            draftEmailContent={draftEmailContent}
            setDraftEmailContent={setDraftEmailContent}
            onStartEditing={handleStartEditing}
            onSave={handleSaveEmail}
            onCancel={handleCancelEditing}
            isSavingEmailData={isSavingEmailData}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            text="Send invite"
            className="w-fit"
            loading={isPending || isSubmitting || isSubmitSuccessful}
            disabled={
              isPending ||
              (recipientEmails.length === 0 && emailInput.trim().length === 0) ||
              isEditingEmail ||
              isSavingEmailData
            }
          />
        </div>
      </div>
    </form>
  );
}

function EmailPreview({
  isEditingEmail,
  emailContent,
  draftEmailContent,
  setDraftEmailContent,
  onStartEditing,
  onSave,
  onCancel,
  isSavingEmailData,
}: {
  isEditingEmail: boolean;
  emailContent: EmailContent;
  draftEmailContent: EmailContent;
  setDraftEmailContent: (content: EmailContent) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSavingEmailData: boolean;
}) {
  const { program } = useProgram();
  const { verifiedEmailDomain } = useEmailDomains();

  const { isMobile } = useMediaQuery();
  const richTextRef = useRef<{ setContent: (content: any) => void }>(null);

  const displayContent = isEditingEmail ? draftEmailContent : emailContent;

  // Update editor content when switching to edit mode
  const prevIsEditingEmail = useRef(isEditingEmail);
  useEffect(() => {
    if (isEditingEmail && !prevIsEditingEmail.current && richTextRef.current) {
      richTextRef.current.setContent(draftEmailContent.body);
    }
    prevIsEditingEmail.current = isEditingEmail;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingEmail]);

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-medium text-neutral-900">Email preview</h2>
        <div className="flex items-center gap-2">
          {isEditingEmail ? (
            <>
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={onCancel}
              />
              <Button
                type="button"
                variant="primary"
                text="Save"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={onSave}
                loading={isSavingEmailData}
                disabled={isSavingEmailData}
              />
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              text="Edit"
              className="h-7 w-fit rounded-lg px-2.5 text-sm"
              onClick={onStartEditing}
            />
          )}
        </div>
      </div>
      <div className="border-border-subtle -mx-px -mb-px overflow-hidden rounded-lg border bg-white">
        {isEditingEmail ? (
          <div className="p-5">
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label
                  htmlFor="email-subject"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Subject
                </label>
                <div className="mt-1.5">
                  <input
                    id="email-subject"
                    type="text"
                    value={draftEmailContent.subject}
                    onChange={(e) =>
                      setDraftEmailContent({
                        ...draftEmailContent,
                        subject: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                    placeholder="Email subject"
                    autoFocus={!isMobile}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email-title"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Title
                </label>
                <div className="mt-1.5">
                  <input
                    id="email-title"
                    type="text"
                    value={draftEmailContent.title}
                    onChange={(e) =>
                      setDraftEmailContent({
                        ...draftEmailContent,
                        title: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                    placeholder="Email title"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email-body"
                  className="block text-sm font-medium text-neutral-900"
                >
                  Content
                </label>
                <div className="mt-1.5">
                  <RichTextProvider
                    key="edit-email-body"
                    ref={richTextRef}
                    features={["bold", "italic", "links"]}
                    markdown
                    placeholder="Start typing..."
                    initialValue={draftEmailContent.body}
                    editorClassName="block max-h-48 overflow-auto scrollbar-hide w-full resize-none border-none p-3 text-base sm:text-sm"
                    onChange={(editor) => {
                      const markdown = (editor as any).getMarkdown() || null;
                      setDraftEmailContent({
                        ...draftEmailContent,
                        body: markdown || "",
                      });
                    }}
                    editorProps={{
                      handleDOMEvents: {
                        keydown: (_, e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            e.stopPropagation();
                            onSave();
                            return false;
                          }
                        },
                      },
                    }}
                  >
                    <div
                      className={cn(
                        "overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                      )}
                    >
                      <div className="flex flex-col">
                        <RichTextArea />
                        <RichTextToolbar className="px-1 pb-1" />
                      </div>
                    </div>
                  </RichTextProvider>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-1 border-b border-neutral-200 bg-white px-4 py-3">
              <p className="text-xs text-neutral-500">
                <strong className="font-medium text-neutral-900">From: </strong>
                {verifiedEmailDomain
                  ? `partners@${verifiedEmailDomain.slug}`
                  : "notifications@mail.dub.co"}
              </p>
              <p className="text-xs text-neutral-500">
                <strong className="font-medium text-neutral-900">
                  Subject:{" "}
                </strong>
                {displayContent.subject}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 pb-8">
              <BlurImage
                src={program?.logo || "https://assets.dub.co/logo.png"}
                alt={program?.name || "Dub"}
                className="my-1 size-8 rounded-full"
                width={48}
                height={48}
              />
              <h3 className="font-medium text-neutral-900">
                {displayContent.title}
              </h3>
              <div className="prose prose-sm prose-neutral max-w-none text-neutral-500">
                <RichTextProvider
                  key={`preview-${displayContent.body}`}
                  features={["bold", "italic", "links"]}
                  style="condensed"
                  markdown
                  editable={false}
                  initialValue={displayContent.body}
                  editorClassName="text-sm leading-6 text-neutral-500 [&_a]:font-semibold [&_a]:text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:marker:text-neutral-400"
                >
                  <RichTextArea />
                </RichTextProvider>
              </div>
              <Button
                type="button"
                text="Accept invite"
                className="mt-4 w-fit"
              />
            </div>
          </>
        )}
      </div>
    </div>
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
