import { TagProps } from "@/lib/types";
import {
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import {
  Flag6,
  Gift,
  GlobePointer,
  InputSearch,
  Page2,
  SatelliteDish,
} from "@dub/ui/src";
import {
  constructURLFromUTMParams,
  getParamsFromURL,
  isValidUrl,
} from "@dub/utils";
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
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";
import { MultiTagsIcon } from "./multi-tags-icon";

const UTM_PARAMETERS = [
  {
    key: "utm_source",
    icon: GlobePointer,
    label: "Source",
    placeholder: "google",
    description: "Where the traffic is coming from",
  },
  {
    key: "utm_medium",
    icon: SatelliteDish,
    label: "Medium",
    placeholder: "cpc",
    description: "How the traffic is coming",
  },
  {
    key: "utm_campaign",
    icon: Flag6,
    label: "Campaign",
    placeholder: "summer_sale",
    description: "The name of the campaign",
  },
  {
    key: "utm_term",
    icon: InputSearch,
    label: "Term",
    placeholder: "running shoes",
    description: "The term of the campaign",
  },
  {
    key: "utm_content",
    icon: Page2,
    label: "Content",
    placeholder: "logolink",
    description: "The content of the campaign",
  },
  {
    key: "ref",
    icon: Gift,
    label: "Referral",
    placeholder: "yoursite.com",
    description: "The referral of the campaign",
  },
] as const;

function UTMModal({
  showUTMModal,
  setShowUTMModal,
}: {
  showUTMModal: boolean;
  setShowUTMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();
  const id = useId();

  const { watch, setValue } = useFormContext<LinkFormData>();

  const url = watch("url");
  const enabledParams = useMemo(() => getParamsFromURL(url), [url]);

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
      showModal={showUTMModal}
      setShowModal={setShowUTMModal}
      className="px-5 py-4 sm:max-w-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">UTM Builder</h3>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Add UTM parameters to your short links for conversion tracking."
                cta="Learn more."
                href="https://dub.co/help/article/utm-builder"
              />
            }
          />
        </div>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-gray-700">
                Press <strong className="font-medium text-gray-950">U</strong>{" "}
                to open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-gray-200 font-sans text-xs text-gray-950">
              U
            </kbd>
          </Tooltip>
        </div>
      </div>

      <div className="grid gap-y-3 py-4">
        {UTM_PARAMETERS.map(
          ({ key, icon: Icon, label, placeholder, description }) => {
            return (
              <div key={key} className="group relative">
                <div className="relative z-10 flex">
                  <div className="flex items-center gap-1.5 rounded-l-md border-y border-l border-gray-300 bg-gray-50 px-3 py-1.5 text-gray-700 sm:min-w-28">
                    <Icon className="size-4 shrink-0" />
                    <label htmlFor={`${id}-${key}`} className="text-sm">
                      {label}
                    </label>
                  </div>
                  <input
                    type="text"
                    id={`${id}-${key}`}
                    placeholder={placeholder}
                    disabled={!isValidUrl(url)}
                    className="h-full min-w-0 grow rounded-r-md border border-gray-300 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 disabled:cursor-not-allowed sm:text-sm"
                    value={enabledParams[key] || ""}
                    onChange={(e) => {
                      setValue(
                        "url",
                        constructURLFromUTMParams(url, {
                          ...enabledParams,
                          [key]: e.target.value,
                        }),
                      );
                    }}
                  />
                </div>
                <div className="relative mt-1 cursor-default text-xs text-gray-500">
                  <span className="ml-2 rounded-b-md border border-t-0 border-gray-300 bg-gray-50 px-1.5 pb-1 pt-2 font-mono">
                    {key}
                  </span>
                  <p className="ml-2 inline-flex opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    → {description}
                  </p>
                </div>
              </div>
            );
          },
        )}
      </div>

      {isValidUrl(url) && (
        <div className="mt-4 grid gap-y-1">
          <p className="text-sm text-gray-700">Current URL</p>
          <div className="overflow-scroll break-words rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-500">
            {url}
          </div>
        </div>
      )}
    </Modal>
  );
}

function UTMButton({
  setShowUTMModal,
}: {
  setShowUTMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const url = watch("url");
  const enabledParams = useMemo(() => getParamsFromURL(url), [url]);

  useKeyboardShortcut("u", () => setShowUTMModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text="UTM Builder"
      icon={
        <MultiTagsIcon
          tags={
            [
              enabledParams.utm_source && { color: "blue" },
              enabledParams.utm_medium && { color: "green" },
              enabledParams.utm_campaign && { color: "red" },
              enabledParams.utm_term && { color: "yellow" },
              enabledParams.utm_content && { color: "purple" },
            ].filter(Boolean) as { color: TagProps["color"] }[]
          }
        />
      }
      className="h-9 w-fit px-2.5 font-medium text-gray-700"
      onClick={() => setShowUTMModal(true)}
    />
  );
}

export function useUTMModal() {
  const [showUTMModal, setShowUTMModal] = useState(false);

  const UTMModalCallback = useCallback(() => {
    return (
      <UTMModal showUTMModal={showUTMModal} setShowUTMModal={setShowUTMModal} />
    );
  }, [showUTMModal, setShowUTMModal]);

  const UTMButtonCallback = useCallback(() => {
    return <UTMButton setShowUTMModal={setShowUTMModal} />;
  }, [setShowUTMModal]);

  return useMemo(
    () => ({
      setShowUTMModal,
      UTMModal: UTMModalCallback,
      UTMButton: UTMButtonCallback,
    }),
    [setShowUTMModal, UTMModalCallback, UTMButtonCallback],
  );
}
