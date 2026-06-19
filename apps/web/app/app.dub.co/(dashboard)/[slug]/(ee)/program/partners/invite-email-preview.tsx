import {
  Button,
  Gift,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  Sparkle3,
  Tooltip,
  Trophy,
  useMediaQuery,
} from "@dub/ui";
import { LoadingSpinner, Lock } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { RotateCcw } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type EmailContent = {
  subject: string;
  title: string;
  body: string;
};

type GenerateEmailOptions = {
  applyGeneratedEmail?: boolean;
};

const INVITE_GENERATION_STEPS = ["Analyzing profile", "Constructing invite"];

export function InviteEmailPreview({
  emailContent,
  defaultEmailContent,
  fromAddress,
  onSave,
  onGenerate,
  onReset,
  onEditingChange,
  isSaving = false,
  isGenerating = false,
  showReset = false,
  generateDisabledTooltip,
  generationAvatar,
}: {
  emailContent: EmailContent;
  defaultEmailContent: EmailContent;
  fromAddress: string;
  // Persists the sanitized content; returning false keeps the edit mode open
  onSave: (content: EmailContent) => Promise<boolean> | boolean;
  onGenerate?: (options?: GenerateEmailOptions) => Promise<EmailContent | void>;
  onReset?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
  isSaving?: boolean;
  isGenerating?: boolean;
  showReset?: boolean;
  // When set, disables the generate button and explains why
  generateDisabledTooltip?: string;
  generationAvatar?: ReactNode;
}) {
  const { isMobile } = useMediaQuery();
  const richTextRef = useRef<{ setContent: (content: any) => void }>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draftEmailContent, setDraftEmailContent] =
    useState<EmailContent>(emailContent);

  const updateIsEditing = (editing: boolean) => {
    setIsEditing(editing);
    onEditingChange?.(editing);
  };

  const handleStartEditing = () => {
    setDraftEmailContent(emailContent);
    updateIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraftEmailContent(emailContent);
    updateIsEditing(false);
  };

  const handleSaveEmail = async () => {
    const sanitizedSubject = draftEmailContent.subject.trim();
    const sanitizedTitle = draftEmailContent.title.trim();
    let sanitizedBody = draftEmailContent.body.trim();

    // Enforce max length validation (matches schema)
    if (sanitizedBody.length > 3000) {
      sanitizedBody = sanitizedBody.substring(0, 3000);
      toast.error("Email body was truncated to 3000 characters");
    }

    const finalContent: EmailContent = {
      subject: sanitizedSubject || defaultEmailContent.subject,
      title: sanitizedTitle || defaultEmailContent.title,
      body: sanitizedBody || defaultEmailContent.body,
    };

    if (
      onReset &&
      finalContent.subject === defaultEmailContent.subject &&
      finalContent.title === defaultEmailContent.title &&
      finalContent.body === defaultEmailContent.body
    ) {
      onReset();
      setDraftEmailContent(defaultEmailContent);
      updateIsEditing(false);
      return;
    }

    if (await onSave(finalContent)) {
      setDraftEmailContent(finalContent);
      updateIsEditing(false);
    }
  };

  const handleResetEmail = () => {
    if (!isEditing) {
      onReset?.();
    }

    setDraftEmailContent(defaultEmailContent);
    richTextRef.current?.setContent(defaultEmailContent.body);
  };

  const handleGenerateEmail = async () => {
    const generatedContent = await onGenerate?.({
      applyGeneratedEmail: !isEditing,
    });

    if (!generatedContent) {
      return;
    }

    setDraftEmailContent(generatedContent);
    richTextRef.current?.setContent(generatedContent.body);
  };

  const displayContent = isEditing ? draftEmailContent : emailContent;
  const showGeneratedActions = showReset && Boolean(onGenerate);

  // Update editor content when switching to edit mode
  const prevIsEditing = useRef(isEditing);
  useEffect(() => {
    if (isEditing && !prevIsEditing.current && richTextRef.current) {
      richTextRef.current.setContent(draftEmailContent.body);
    }
    prevIsEditing.current = isEditing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm font-medium text-neutral-900">Email preview</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={handleCancelEditing}
                disabled={isGenerating}
              />
              <Button
                type="button"
                variant="primary"
                text="Save"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={handleSaveEmail}
                loading={isSaving}
                disabled={isSaving || isGenerating}
              />
            </>
          ) : (
            <>
              {showReset && onReset && (
                <ResetInviteButton
                  onClick={handleResetEmail}
                  disabled={isGenerating}
                />
              )}
              {onGenerate && !showGeneratedActions && (
                <PersonalizeButton
                  variant="full"
                  onClick={handleGenerateEmail}
                  isGenerating={isGenerating}
                  disabledTooltip={generateDisabledTooltip}
                />
              )}
              <Button
                type="button"
                variant="secondary"
                text="Edit"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={handleStartEditing}
                disabled={isGenerating}
              />
            </>
          )}
        </div>
      </div>
      <div className="border-border-subtle -mx-px -mb-px overflow-hidden rounded-lg border bg-white">
        {isEditing ? (
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
                      setDraftEmailContent((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                    placeholder="Email subject"
                    maxLength={255}
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
                      setDraftEmailContent((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                    placeholder="Email title"
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="email-body"
                    className="block text-sm font-medium text-neutral-900"
                  >
                    Body
                  </label>

                  {(showReset || onGenerate) && (
                    <div className="flex items-center gap-2">
                      {showReset && onReset && (
                        <ResetInviteButton
                          onClick={handleResetEmail}
                          disabled={isGenerating}
                        />
                      )}
                      {onGenerate && (
                        <PersonalizeButton
                          variant="icon"
                          onClick={handleGenerateEmail}
                          isGenerating={isGenerating}
                          disabledTooltip={generateDisabledTooltip}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-1.5">
                  <RichTextProvider
                    key="edit-email-body"
                    ref={richTextRef}
                    features={["bold", "italic", "links"]}
                    markdown
                    placeholder="Start typing..."
                    initialValue={draftEmailContent.body}
                    editorClassName="min-h-full w-full border-none px-3 pb-3 pt-2 text-base sm:text-sm"
                    onChange={(editor) => {
                      const markdown = (editor as any).getMarkdown() || null;
                      setDraftEmailContent((prev) => ({
                        ...prev,
                        body: markdown || "",
                      }));
                    }}
                    editorProps={{
                      handleDOMEvents: {
                        keydown: (_, e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isSaving || isGenerating) {
                              return false;
                            }
                            handleSaveEmail();
                            return false;
                          }
                        },
                      },
                    }}
                  >
                    <div
                      className={cn(
                        "h-80 max-h-[70vh] min-h-56 resize-y overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                      )}
                    >
                      <div className="flex h-full min-h-0 flex-col">
                        <RichTextToolbar className="border-b border-neutral-200 px-2 py-1" />
                        <RichTextArea className="scrollbar-hide min-h-0 flex-1 overflow-auto" />
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
                {fromAddress}
              </p>
              <p className="text-xs text-neutral-500">
                <strong className="font-medium text-neutral-900">
                  Subject:{" "}
                </strong>
                {displayContent.subject}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 pb-6">
              {isGenerating ? (
                <InviteGenerationProgress avatar={generationAvatar} />
              ) : (
                <>
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
                      editorClassName="text-sm leading-6 text-neutral-500 [&_a]:font-semibold [&_a]:text-neutral-800 [&_a]:underline [&_a]:underline-offset-2 [&_p]:my-0 [&_p:not(:last-child)]:mb-4 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:marker:text-neutral-400"
                    >
                      <RichTextArea />
                    </RichTextProvider>
                  </div>
                  <InvitePreviewProgramDetails />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InviteEmailIconButton({
  icon,
  label,
  tooltip,
  onClick,
  disabled,
  loading,
}: {
  icon: ReactNode;
  label: string;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Tooltip content={tooltip}>
      <span className="inline-flex">
        <button
          type="button"
          aria-label={label}
          className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
          onClick={onClick}
          disabled={disabled || loading}
        >
          {loading ? <LoadingSpinner className="size-3.5" /> : icon}
        </button>
      </span>
    </Tooltip>
  );
}

function ResetInviteButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <InviteEmailIconButton
      icon={<RotateCcw className="size-3.5" />}
      label="Reset to the default invite"
      tooltip="Reset to the default invite"
      onClick={onClick}
      disabled={disabled}
    />
  );
}

function PersonalizeButton({
  variant,
  onClick,
  isGenerating,
  disabledTooltip,
}: {
  variant: "full" | "icon";
  onClick: () => void;
  isGenerating: boolean;
  disabledTooltip?: string;
}) {
  // Single source of truth for when personalization is unavailable
  const disabled = isGenerating || Boolean(disabledTooltip);

  if (variant === "icon") {
    return (
      <InviteEmailIconButton
        icon={<Sparkle3 className="size-3.5" />}
        label="Personalize invite"
        tooltip={disabledTooltip || "Personalize this invite"}
        onClick={onClick}
        disabled={disabled}
        loading={isGenerating}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      text="Personalize"
      icon={<Sparkle3 className="size-3.5" />}
      className="h-7 w-fit rounded-lg px-2.5 text-sm"
      onClick={onClick}
      loading={isGenerating}
      disabled={disabled}
      disabledTooltip={disabledTooltip}
    />
  );
}

function InviteGenerationProgress({ avatar }: { avatar?: ReactNode }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStepIndex((current) =>
        Math.min(current + 1, INVITE_GENERATION_STEPS.length - 1),
      );
    }, 1600);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 py-12">
      <div className="flex flex-col items-center">
        {avatar ? (
          <div className="overflow-hidden rounded-full shadow-md">{avatar}</div>
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 shadow-sm">
            <Sparkle3 className="size-5 animate-pulse text-neutral-500" />
          </div>
        )}

        <div
          key={INVITE_GENERATION_STEPS[stepIndex]}
          className="animate-text-appear mt-6 flex items-center gap-2 text-sm font-semibold text-neutral-900"
        >
          <Sparkle3 className="size-3.5 shrink-0 animate-pulse text-neutral-400" />
          <span
            className="animate-gradient-move bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #171717 0%, #171717 35%, #a3a3a3 50%, #171717 65%, #171717 100%)",
              backgroundSize: "200% 100%",
            }}
          >
            {INVITE_GENERATION_STEPS[stepIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}

function InvitePreviewProgramDetails() {
  return (
    <div className="mt-4 rounded-[10px] border border-blue-200 bg-blue-50 p-4 pt-3">
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-900">
        <Lock className="size-4 text-blue-500" />
        <span>Program details</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <PreviewInfoCard
          icon={<Gift className="size-5" />}
          label="Eligible Rewards"
        />
        <PreviewInfoCard
          icon={<Trophy className="size-5" />}
          label="Eligible Bounties"
        />
      </div>

      <Button
        type="button"
        text="View invite"
        className="mt-3 h-9 w-full rounded-lg bg-neutral-900 font-semibold text-white hover:bg-neutral-900"
      />
    </div>
  );
}

function PreviewInfoCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-blue-100 bg-blue-100 px-4 pb-3 pt-4 text-center text-blue-900">
      <div className="mb-1.5">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}
