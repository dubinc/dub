import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps, PartnerProps } from "@/lib/types";
import {
  ArrowTurnLeft,
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { getDomainWithoutWWW, linkConstructor } from "@dub/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { X } from "../shared/icons";

interface AddPartnerLinkModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (link: LinkProps) => void;
  partner: Pick<PartnerProps, "id" | "email">;
}

type FormData = Pick<LinkProps, "url" | "key">;

const AddPartnerLinkModal = ({
  showModal,
  setShowModal,
  onSuccess,
  partner,
}: AddPartnerLinkModalProps) => {
  const { program } = useProgram();
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const [, copyToClipboard] = useCopyToClipboard();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      url: "",
      key: "",
    },
  });

  const key = watch("key");
  const destinationDomain = getDomainWithoutWWW(program?.url || "");

  const onSubmit = async (formData: FormData) => {
    if (!destinationDomain || !program?.id || !partner.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/links?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          partnerId: partner.id,
          programId: program.id,
          domain: program.domain,
          url: linkConstructor({
            domain: destinationDomain,
            key: formData.url,
          }),
          trackConversion: true,
          folderId: program.defaultFolderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error.message);
      }

      await mutate(`/api/partners?workspaceId=${workspaceId}`);
      toast.success("Link created successfully!");
      onSuccess?.(data);
      setShowModal(false);
      copyToClipboard(data.shortLink);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-lg"
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col items-start justify-between gap-4 px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <h3 className="text-lg font-medium">New partner link</h3>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="key"
                    className="block text-sm font-medium text-neutral-700"
                  >
                    Short Link
                  </label>

                  <InfoTooltip
                    content={
                      <SimpleTooltipContent
                        title="This is the short link that will redirect to your destination URL."
                        cta="Learn more."
                        href="https://dub.co/help/article/how-to-create-link"
                      />
                    }
                  />
                </div>
              </div>

              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                  {program?.domain}
                </span>

                <input
                  {...register("key", { required: true })}
                  type="text"
                  id="key"
                  autoFocus={!isMobile}
                  className={
                    "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  }
                  placeholder={partner.email?.split("@")[0] || "short-link"}
                />
              </div>

              {errorMessage && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Destination URL
                </label>

                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="The URL your users will get redirected to when they visit your short link."
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-create-link"
                    />
                  }
                />
              </div>

              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                  {destinationDomain}
                </span>

                <input
                  {...register("url", { required: false })}
                  type="text"
                  id="url"
                  placeholder="(optional)"
                  className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    e.preventDefault();

                    const text = e.clipboardData.getData("text/plain");

                    try {
                      const url = new URL(text);
                      e.currentTarget.value = url.pathname.slice(1);
                    } catch (err) {
                      e.currentTarget.value = text;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 bg-neutral-50 p-4">
          <Button
            type="submit"
            text={
              <span className="flex items-center gap-2">
                Create link
                <div className="rounded border border-white/20 p-1">
                  <ArrowTurnLeft className="size-3.5" />
                </div>
              </span>
            }
            className="h-8 w-fit pl-2.5 pr-1.5"
            loading={isSubmitting}
            disabled={!key}
          />
        </div>
      </form>
    </Modal>
  );
};

export function useAddPartnerLinkModal({
  onSuccess,
  partner,
}: {
  onSuccess?: (link: LinkProps) => void;
  partner: Pick<PartnerProps, "id" | "email">;
}) {
  const [showAddPartnerLinkModal, setShowAddPartnerLinkModal] = useState(false);

  const AddPartnerLinkModalCallback = useCallback(() => {
    return (
      <AddPartnerLinkModal
        showModal={showAddPartnerLinkModal}
        setShowModal={setShowAddPartnerLinkModal}
        onSuccess={onSuccess}
        partner={partner}
      />
    );
  }, [showAddPartnerLinkModal, setShowAddPartnerLinkModal, partner]);

  return useMemo(
    () => ({
      setShowAddPartnerLinkModal,
      AddPartnerLinkModal: AddPartnerLinkModalCallback,
    }),
    [setShowAddPartnerLinkModal, AddPartnerLinkModalCallback],
  );
}
