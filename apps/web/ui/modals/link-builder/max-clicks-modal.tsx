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
import { CursorRays } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

function MaxClicksModal({
  showMaxClicksModal,
  setShowMaxClicksModal,
}: {
  showMaxClicksModal: boolean;
  setShowMaxClicksModal: Dispatch<SetStateAction<boolean>>;
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
    formState: { isDirty, errors },
    handleSubmit,
  } = useForm<Pick<LinkFormData, "maxClicks" | "maxClicksUrl">>({
    values: {
      maxClicks: getValuesParent("maxClicks"),
      maxClicksUrl: getValuesParent("maxClicksUrl"),
    },
  });

  const [maxClicks, maxClicksUrl] = watch(["maxClicks", "maxClicksUrl"]);
  const maxClicksParent = watchParent("maxClicks");

  const inputRef = useRef<HTMLInputElement>(null);

  // Hacky fix to focus the input automatically, not sure why autoFocus doesn't work here
  useEffect(() => {
    if (inputRef.current && !isMobile) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, []);

  return (
    <Modal
      showModal={showMaxClicksModal}
      setShowModal={setShowMaxClicksModal}
      className="sm:max-w-md"
    >
      <form
        className="px-5 py-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit((data) => {
            setValueParent("maxClicks", data.maxClicks, {
              shouldDirty: true,
            });
            setValueParent("maxClicksUrl", data.maxClicksUrl, {
              shouldDirty: true,
            });
            setShowMaxClicksModal(false);
          })(e);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Max Clicks</h3>
            <ProBadgeTooltip
              content={
                <SimpleTooltipContent
                  title="Set a maximum number of clicks for your links – after which it won't be accessible."
                  cta="Learn more."
                  href="https://dub.co/help/article/link-expiration"
                />
              }
            />
          </div>
          <div className="max-md:hidden">
            <Tooltip
              content={
                <div className="px-2 py-1 text-xs text-neutral-700">
                  Press{" "}
                  <strong className="font-medium text-neutral-950">M</strong> to
                  open this quickly
                </div>
              }
              side="right"
            >
              <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
                M
              </kbd>
            </Tooltip>
          </div>
        </div>

        {/* Max Clicks */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${id}-maxClicks`}
              className="block text-sm font-medium text-neutral-700"
            >
              Maximum Clicks
            </label>
          </div>
          <div className="mt-2 flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white shadow-sm transition-all focus-within:border-neutral-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-neutral-500">
            <input
              ref={inputRef}
              id={`${id}-maxClicks`}
              type="number"
              min="1"
              placeholder="E.g. 100"
              defaultValue={maxClicks || ""}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setValue("maxClicks", value, { shouldDirty: true });
                } else {
                  setValue("maxClicks", undefined, { shouldDirty: true });
                }
              }}
              className="flex-1 border-none bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
            />
          </div>
        </div>

        {/* Max Clicks URL */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${id}-maxClicksUrl`}
              className="block text-sm font-medium text-neutral-700"
            >
              Redirect URL
            </label>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Redirect users to a specific URL when the link has reached its maximum clicks."
                  cta="Learn more."
                  href="https://dub.co/help/article/link-expiration#setting-a-custom-expiration-url"
                />
              }
            />
          </div>
          <div className="mt-2 rounded-md shadow-sm">
            <input
              id={`${id}-maxClicksUrl`}
              type="text"
              placeholder="https://example.com"
              className={`${
                errors.maxClicksUrl
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500"
              } block w-full rounded-md focus:outline-none sm:text-sm`}
              {...register("maxClicksUrl")}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {Boolean(maxClicksParent) && (
              <button
                type="button"
                className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
                onClick={() => {
                  setValueParent("maxClicks", null, { shouldDirty: true });
                  setValueParent("maxClicksUrl", null, { shouldDirty: true });
                  setShowMaxClicksModal(false);
                }}
              >
                Remove max clicks
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
                setShowMaxClicksModal(false);
              }}
            />
            <Button
              type="submit"
              variant="primary"
              text={maxClicksParent ? "Save" : "Add max clicks"}
              className="h-9 w-fit"
              disabled={!isDirty}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function getMaxClicksLabel({
  maxClicks,
}: Pick<LinkFormData, "maxClicks">) {
  return maxClicks ? `${maxClicks} clicks` : "Max Clicks";
}

function MaxClicksButton({
  setShowMaxClicksModal,
}: {
  setShowMaxClicksModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const maxClicks = watch("maxClicks");

  useKeyboardShortcut("m", () => setShowMaxClicksModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text={getMaxClicksLabel({ maxClicks })}
      icon={
        <CursorRays className={cn("size-4", maxClicks && "text-blue-500")} />
      }
      className="h-9 w-fit px-2.5 font-medium text-neutral-700"
      onClick={() => setShowMaxClicksModal(true)}
    />
  );
}

export function useMaxClicksModal() {
  const [showMaxClicksModal, setShowMaxClicksModal] = useState(false);

  const MaxClicksModalCallback = useCallback(() => {
    return (
      <MaxClicksModal
        showMaxClicksModal={showMaxClicksModal}
        setShowMaxClicksModal={setShowMaxClicksModal}
      />
    );
  }, [showMaxClicksModal, setShowMaxClicksModal]);

  const MaxClicksButtonCallback = useCallback(() => {
    return <MaxClicksButton setShowMaxClicksModal={setShowMaxClicksModal} />;
  }, [setShowMaxClicksModal]);

  return useMemo(
    () => ({
      setShowMaxClicksModal,
      MaxClicksModal: MaxClicksModalCallback,
      MaxClicksButton: MaxClicksButtonCallback,
    }),
    [setShowMaxClicksModal, MaxClicksModalCallback, MaxClicksButtonCallback],
  );
}
