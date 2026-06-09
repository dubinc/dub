import {
  Button,
  Gift,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  Trophy,
  useMediaQuery,
} from "@dub/ui";
import { Lock } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type EmailContent = {
  subject: string;
  title: string;
  body: string;
};

export function InviteEmailPreview({
  emailContent,
  defaultEmailContent,
  fromAddress,
  onSave,
  onEditingChange,
  isSaving = false,
}: {
  emailContent: EmailContent;
  defaultEmailContent: EmailContent;
  fromAddress: string;
  // Persists the sanitized content; returning false keeps the edit mode open
  onSave: (content: EmailContent) => Promise<boolean> | boolean;
  onEditingChange?: (isEditing: boolean) => void;
  isSaving?: boolean;
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

    if (await onSave(finalContent)) {
      setDraftEmailContent(finalContent);
      updateIsEditing(false);
    }
  };

  const displayContent = isEditing ? draftEmailContent : emailContent;

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
              />
              <Button
                type="button"
                variant="primary"
                text="Save"
                className="h-7 w-fit rounded-lg px-2.5 text-sm"
                onClick={handleSaveEmail}
                loading={isSaving}
                disabled={isSaving}
              />
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              text="Edit"
              className="h-7 w-fit rounded-lg px-2.5 text-sm"
              onClick={handleStartEditing}
            />
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
                            if (isSaving) {
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
              <InvitePreviewProgramDetails />
            </div>
          </>
        )}
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
