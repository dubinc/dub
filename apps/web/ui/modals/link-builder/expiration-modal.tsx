import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import { CircleHalfDottedClock } from "@dub/ui/src/icons";
import {
  cn,
  formatDate,
  formatDateTime,
  getDateTimeLocal,
  parseDateTime,
} from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

function ExpirationModal({
  showExpirationModal,
  setShowExpirationModal,
}: {
  showExpirationModal: boolean;
  setShowExpirationModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();
  const id = useId();

  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    watch,
    register,
    setValue,
    reset,
    formState: { errors },
    handleSubmit,
  } = useForm<Pick<LinkFormData, "expiresAt" | "expiredUrl">>({
    values: {
      expiresAt: getValuesParent("expiresAt"),
      expiredUrl: getValuesParent("expiredUrl"),
    },
  });

  const [expiresAt] = watch(["expiresAt", "expiredUrl"]);
  const expiresAtParent = watchParent("expiresAt");

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Modal
        showModal={showExpirationModal}
        setShowModal={setShowExpirationModal}
        className="sm:max-w-md"
      >
        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit((data) => {
              setValueParent("expiresAt", data.expiresAt);
              setValueParent("expiredUrl", data.expiredUrl);
              setShowExpirationModal(false);
            })(e);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Link Expiration</h3>
              <ProBadgeTooltip
                content={
                  <SimpleTooltipContent
                    title="Set an expiration date for your links – after which it won't be accessible."
                    cta="Learn more."
                    href="https://dub.co/help/article/link-expiration"
                  />
                }
              />
            </div>
            <div className="max-md:hidden">
              <Tooltip
                content={
                  <div className="px-2 py-1 text-xs text-gray-700">
                    Press{" "}
                    <strong className="font-medium text-gray-950">E</strong> to
                    open this quickly
                  </div>
                }
                side="right"
              >
                <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-gray-200 font-sans text-xs text-gray-950">
                  E
                </kbd>
              </Tooltip>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`${id}-expiresAt`}
                className="block text-sm font-medium text-gray-700"
              >
                Date and Time
              </label>
            </div>
            <div className="mt-2 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white shadow-sm transition-all focus-within:border-gray-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-gray-500">
              <input
                ref={inputRef}
                id={`${id}-expiresAt`}
                type="text"
                placeholder='E.g. "tomorrow at 5pm" or "in 2 hours"'
                defaultValue={expiresAt ? formatDateTime(expiresAt) : ""}
                onBlur={(e) => {
                  if (e.target.value.length > 0) {
                    const parsedDateTime = parseDateTime(e.target.value);
                    if (parsedDateTime) {
                      setValue("expiresAt", parsedDateTime);
                      e.target.value = formatDateTime(parsedDateTime);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputRef.current) {
                    e.preventDefault();
                    const parsedDateTime = parseDateTime(
                      inputRef.current.value,
                    );
                    if (parsedDateTime) {
                      setValue("expiresAt", parsedDateTime);
                      inputRef.current.value = formatDateTime(parsedDateTime);
                    }
                  }
                }}
                className="flex-1 border-none bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
              />
              <input
                type="datetime-local"
                id="expiresAt"
                name="expiresAt"
                value={expiresAt ? getDateTimeLocal(expiresAt) : ""}
                onChange={(e) => {
                  const expiryDate = new Date(e.target.value);
                  setValue("expiresAt", expiryDate);
                  if (inputRef.current) {
                    inputRef.current.value = formatDateTime(expiryDate);
                  }
                }}
                className="w-[40px] border-none bg-transparent text-gray-500 focus:outline-none focus:ring-0 sm:text-sm"
              />
            </div>
          </div>

          {/* Expiration URL */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`${id}-expiredUrl`}
                className="block text-sm font-medium text-gray-700"
              >
                Expiration URL
              </label>
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title="Redirect users to a specific URL when the link has expired."
                    cta="Learn more."
                    href="https://dub.co/help/article/link-expiration#setting-a-custom-expiration-url"
                  />
                }
              />
            </div>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-expiredUrl`}
                type="text"
                autoFocus={!isMobile}
                placeholder="https://example.com"
                className={`${
                  errors.expiredUrl
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
                } block w-full rounded-md focus:outline-none sm:text-sm`}
                {...register("expiredUrl")}
              />
            </div>
          </div>

          <a
            href="https://dub.co/help/article/link-expiration#setting-a-default-expiration-url-for-all-links-under-a-domain"
            target="_blank"
            className="group mt-2 flex items-center text-xs text-gray-500 hover:text-gray-700"
          >
            Set a default expiration URL for your domain
          </a>

          <div className="mt-6 flex items-center justify-between">
            <div>
              {Boolean(expiresAtParent) && (
                <button
                  type="button"
                  className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950"
                  onClick={() => {
                    setValueParent("expiresAt", null);
                    setValueParent("expiredUrl", null);
                    setShowExpirationModal(false);
                  }}
                >
                  Remove expiration
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => {
                  reset();
                  setShowExpirationModal(false);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                text={expiresAtParent ? "Save" : "Add expiration"}
                className="h-9 w-fit"
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function getExpirationLabel({
  expiresAt,
}: Pick<LinkFormData, "expiresAt">) {
  return expiresAt
    ? formatDate(expiresAt, {
        month: "short",
        year: undefined,
        timeZone: undefined,
      }) || "Expiration"
    : "Expiration";
}

function ExpirationButton({
  setShowExpirationModal,
}: {
  setShowExpirationModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const expiresAt = watch("expiresAt");

  useKeyboardShortcut("e", () => setShowExpirationModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text={getExpirationLabel({ expiresAt })}
      icon={
        <CircleHalfDottedClock
          className={cn("size-4", expiresAt && "text-blue-500")}
        />
      }
      className="h-9 w-fit px-2.5 font-medium text-gray-700"
      onClick={() => setShowExpirationModal(true)}
    />
  );
}

export function useExpirationModal() {
  const [showExpirationModal, setShowExpirationModal] = useState(false);

  const ExpirationModalCallback = useCallback(() => {
    return (
      <ExpirationModal
        showExpirationModal={showExpirationModal}
        setShowExpirationModal={setShowExpirationModal}
      />
    );
  }, [showExpirationModal, setShowExpirationModal]);

  const ExpirationButtonCallback = useCallback(() => {
    return <ExpirationButton setShowExpirationModal={setShowExpirationModal} />;
  }, [setShowExpirationModal]);

  return useMemo(
    () => ({
      setShowExpirationModal,
      ExpirationModal: ExpirationModalCallback,
      ExpirationButton: ExpirationButtonCallback,
    }),
    [setShowExpirationModal, ExpirationModalCallback, ExpirationButtonCallback],
  );
}
