import {
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import { DiamondTurnRight } from "@dub/ui/src";
import { UTM_PARAMETERS, UTMBuilder } from "@dub/ui/src/utm-builder";
import {
  cn,
  constructURLFromUTMParams,
  getParamsFromURL,
  isValidUrl,
} from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { LinkFormData } from ".";
import { UTMTemplatesCombo } from "./utm-templates-combo";

type UTMModalProps = {
  showUTMModal: boolean;
  setShowUTMModal: Dispatch<SetStateAction<boolean>>;
};

function UTMModal(props: UTMModalProps) {
  return (
    <Modal
      showModal={props.showUTMModal}
      setShowModal={props.setShowUTMModal}
      className="px-5 py-4 sm:max-w-md"
    >
      <UTMModalInner {...props} />
    </Modal>
  );
}

function UTMModalInner({ setShowUTMModal }: UTMModalProps) {
  const { getValues: getValuesParent, setValue: setValueParent } =
    useFormContext<LinkFormData>();

  const form = useForm<
    Pick<
      LinkFormData,
      | "url"
      | "utm_source"
      | "utm_medium"
      | "utm_campaign"
      | "utm_term"
      | "utm_content"
    >
  >({
    values: {
      url: getValuesParent("url"),
      utm_source: getValuesParent("utm_source"),
      utm_medium: getValuesParent("utm_medium"),
      utm_campaign: getValuesParent("utm_campaign"),
      utm_term: getValuesParent("utm_term"),
      utm_content: getValuesParent("utm_content"),
    },
  });

  const {
    watch,
    setValue,
    reset,
    formState: { isDirty },
    handleSubmit,
  } = form;

  const url = watch("url");
  const enabledParams = useMemo(() => getParamsFromURL(url), [url]);

  // Update targeting URL params if they previously matched the same params of the destination URL
  const updateTargeting = useCallback(
    (
      data: Pick<
        LinkFormData,
        | "url"
        | "utm_source"
        | "utm_medium"
        | "utm_campaign"
        | "utm_term"
        | "utm_content"
      >,
    ) => {
      const [parentUrl, ios, android, geo] = getValuesParent([
        "url",
        "ios",
        "android",
        "geo",
      ]);

      const getNewParams = (targetURL: string) => {
        const parentParams = getParamsFromURL(parentUrl);
        const targetParams = getParamsFromURL(targetURL);

        const newParams = UTM_PARAMETERS.filter(
          ({ key }) => parentParams?.[key] === targetParams?.[key],
        ).map(({ key }) => [key, data[key] ?? ""]);

        return newParams.length ? Object.fromEntries(newParams) : null;
      };

      // Update iOS and Android URLs
      Object.entries({ ios, android }).forEach(([target, targetUrl]) => {
        if (!targetUrl) return;
        const newParams = getNewParams(targetUrl);
        if (newParams)
          setValueParent(
            target as "ios" | "android",
            constructURLFromUTMParams(targetUrl, newParams),
            {
              shouldDirty: true,
            },
          );
      });

      // Update geo targeting URLs
      if (geo && Object.keys(geo).length > 0) {
        const newGeo = Object.entries(geo).reduce((acc, [key, value]) => {
          if (!key?.trim() || !value?.trim()) return acc;

          const newParams = getNewParams(value);
          if (!newParams) return acc;

          return {
            ...acc,
            [key]: constructURLFromUTMParams(value, newParams),
          };
        }, {});

        if (Object.keys(newGeo).length > 0)
          setValueParent(
            "geo",
            { ...(geo as Record<string, string>), ...newGeo },
            { shouldDirty: true },
          );
      }
    },
    [],
  );

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit((data) => {
          updateTargeting(data);

          setValueParent("url", data.url);
          UTM_PARAMETERS.filter((p) => p.key !== "ref").forEach((p) =>
            setValueParent(p.key as any, data[p.key], {
              shouldDirty: true,
            }),
          );

          setShowUTMModal(false);
        })(e);
      }}
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

      <div className="py-4">
        <UTMBuilder
          values={enabledParams}
          onChange={(key, value) => {
            if (key !== "ref") setValue(key, value, { shouldDirty: true });

            setValue(
              "url",
              constructURLFromUTMParams(url, {
                ...enabledParams,
                [key]: value,
              }),
              { shouldDirty: true },
            );
          }}
          disabled={!isValidUrl(url)}
          autoFocus
        />
      </div>

      {isValidUrl(url) && (
        <div className="mt-4 grid gap-y-1">
          <span className="block text-sm font-medium text-gray-700">
            URL Preview
          </span>
          <div className="scrollbar-hide mt-2 overflow-scroll break-words rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 font-mono text-xs text-gray-500">
            {url}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <div>
          {isValidUrl(url) && (
            <FormProvider {...form}>
              <UTMTemplatesCombo
                onLoad={(params) => {
                  setValue("url", constructURLFromUTMParams(url, params), {
                    shouldDirty: true,
                  });
                }}
              />
            </FormProvider>
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
              setShowUTMModal(false);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            text="Save"
            className="h-9 w-fit"
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

function UTMButton({
  setShowUTMModal,
}: {
  setShowUTMModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const url = watch("url");
  const enabled = useMemo(
    () =>
      Object.keys(getParamsFromURL(url)).some(
        (k) => UTM_PARAMETERS.findIndex((p) => p.key === k) !== -1,
      ),
    [url],
  );

  useKeyboardShortcut("u", () => setShowUTMModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text="UTM"
      icon={
        <DiamondTurnRight
          className={cn("size-4", enabled && "text-blue-500")}
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
