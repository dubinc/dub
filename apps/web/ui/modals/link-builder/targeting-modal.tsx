import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  Button,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import { Crosshairs3 } from "@dub/ui/src/icons";
import { cn, COUNTRIES } from "@dub/utils";
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

function TargetingModal({
  showTargetingModal,
  setShowTargetingModal,
}: {
  showTargetingModal: boolean;
  setShowTargetingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const id = useId();

  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const { watch, register, setValue, reset, handleSubmit } = useForm<
    Pick<LinkFormData, "ios" | "android" | "geo">
  >({
    values: {
      ios: getValuesParent("ios"),
      android: getValuesParent("android"),
      geo: getValuesParent("geo"),
    },
  });

  const geo = watch("geo");

  const [iosParent, androidParent, geoParent] = watchParent([
    "ios",
    "android",
    "geo",
  ]);

  const parentEnabled = Boolean(
    iosParent || androidParent || Object.keys(geoParent || {}).length > 0,
  );

  return (
    <>
      <Modal
        showModal={showTargetingModal}
        setShowModal={setShowTargetingModal}
        className="sm:max-w-md"
      >
        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit((data) => {
              setValueParent("ios", data.ios);
              setValueParent("android", data.android);

              // Filter out empty geo values
              const geo = Object.fromEntries(
                Object.entries(data.geo || {}).filter(
                  ([key, value]) => key?.trim() && value?.trim(),
                ),
              );
              setValueParent("geo", Object.keys(geo).length > 0 ? geo : null);

              setShowTargetingModal(false);
            })(e);
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Targeting</h3>
            <div className="max-md:hidden">
              <Tooltip
                content={
                  <div className="px-2 py-1 text-xs text-gray-700">
                    Press{" "}
                    <strong className="font-medium text-gray-950">X</strong> to
                    open this quickly
                  </div>
                }
                side="right"
              >
                <kbd className="flex size-6 cursor-default items-center justify-center gap-1 rounded-md border border-gray-200 font-sans text-xs text-gray-950">
                  X
                </kbd>
              </Tooltip>
            </div>
          </div>

          <div className="scrollbar-hide -m-1 mt-6 flex max-h-[calc(100dvh-250px)] flex-col gap-6 overflow-y-auto p-1">
            {/* Geo */}
            <div>
              <div className="flex items-center gap-2">
                <span className="block text-sm font-medium text-gray-700">
                  Geo Targeting
                </span>
                <ProBadgeTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect your users to different links based on their location."
                      cta="Learn more about geo targeting."
                      href="https://dub.co/help/article/geo-targeting"
                    />
                  }
                />
              </div>
              <div className="mt-2">
                {geo && (
                  <div className="mb-2 grid grid-cols-[min-content_1fr] gap-y-2">
                    {Object.entries(geo).map(([key, value]) => (
                      <Fragment key={key}>
                        <select
                          id={`geo-selector-${key}`}
                          value={key}
                          onChange={(e) => {
                            const newGeo = {};
                            delete Object.assign(newGeo, geo, {
                              [e.target.value]: value,
                            })[key];
                            setValue("geo", newGeo);
                          }}
                          className="flex w-32 items-center justify-center rounded-l-md border border-r-0 border-gray-300 bg-white pl-3 pr-7 text-left text-sm text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-0"
                        >
                          <option value="" disabled selected={!key}>
                            Country
                          </option>
                          {Object.entries(COUNTRIES).map(([key, value]) => (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          id={`${id}-${key}`}
                          placeholder="https://example.com"
                          className="h-full grow rounded-r-md border border-gray-300 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
                          value={value}
                          onChange={(e) => {
                            setValue(`geo`, {
                              ...((geo as object) || {}),
                              [key]: e.target.value,
                            });
                          }}
                        />
                      </Fragment>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  text="Add location"
                  className="h-9"
                  onClick={() => {
                    setValue("geo", { ...((geo as object) || {}), "": "" });
                  }}
                  disabled={Object.keys(geo || {}).includes("")}
                />
              </div>
            </div>

            {/* iOS */}
            <div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`${id}-ios-url`}
                  className="block text-sm font-medium text-gray-700"
                >
                  iOS Targeting
                </label>
                <ProBadgeTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect your iOS users to a different link."
                      cta="Learn more about device targeting."
                      href="https://dub.co/help/article/device-targeting"
                    />
                  }
                />
              </div>
              <div className="mt-2 rounded-md shadow-sm">
                <input
                  id={`${id}-ios-url`}
                  placeholder="https://apps.apple.com/app/1611158928"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  {...register("ios")}
                />
              </div>
            </div>

            {/* Android */}
            <div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`${id}-android-url`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Android Targeting
                </label>
                <ProBadgeTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect your Android users to a different link."
                      cta="Learn more about device targeting."
                      href="https://dub.co/help/article/device-targeting"
                    />
                  }
                />
              </div>
              <div className="mt-2 rounded-md shadow-sm">
                <input
                  id={`${id}-android-url`}
                  placeholder="https://play.google.com/store/apps/details?id=com.disney.disneyplus"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  {...register("android")}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              {parentEnabled && (
                <button
                  type="button"
                  className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950"
                  onClick={() => {
                    setValueParent("ios", null);
                    setValueParent("android", null);
                    setValueParent("geo", null);
                    setShowTargetingModal(false);
                  }}
                >
                  Remove targeting
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
                  setShowTargetingModal(false);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                text={parentEnabled ? "Save" : "Add targeting"}
                className="h-9 w-fit"
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function getTargetingLabel({
  ios,
  android,
  geo,
}: Pick<LinkFormData, "ios" | "android" | "geo">) {
  const geoEnabled = Object.keys(geo || {}).length > 0;

  const targets = [Boolean(ios), Boolean(android), geoEnabled];
  const count = targets.filter(Boolean).length;
  const countries = Object.keys(geo || {});

  if (count === 0) return "Targeting";
  if (count === 1) {
    const index = targets.findIndex(Boolean);
    if (index <= 1) return ["iOS", "Android"][index];
    if (!geoEnabled) return "Targeting";

    // Geo
    if (countries.length === 1 && countries[0]) return countries[0];
    return `${countries.length} Target${countries.length === 1 ? "" : "s"}`;
  }

  return `${count + (countries.length > 1 ? countries.length - 1 : 0)} Targets`;
}

function TargetingButton({
  setShowTargetingModal,
}: {
  setShowTargetingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const [ios, android, geo] = watch(["ios", "android", "geo"]);

  useKeyboardShortcut("x", () => setShowTargetingModal(true), {
    modal: true,
  });

  const geoEnabled = Object.keys(geo || {}).length > 0;
  const enabled = Boolean(ios || android || geoEnabled);

  const label = useMemo(
    () => getTargetingLabel({ ios, android, geo }),
    [ios, android, geo],
  );

  return (
    <Button
      variant="secondary"
      text={label}
      icon={
        <Crosshairs3 className={cn("size-4", enabled && "text-blue-500")} />
      }
      className="h-9 w-fit px-2.5 font-medium text-gray-700"
      onClick={() => setShowTargetingModal(true)}
    />
  );
}

export function useTargetingModal() {
  const [showTargetingModal, setShowTargetingModal] = useState(false);

  const TargetingModalCallback = useCallback(() => {
    return (
      <TargetingModal
        showTargetingModal={showTargetingModal}
        setShowTargetingModal={setShowTargetingModal}
      />
    );
  }, [showTargetingModal, setShowTargetingModal]);

  const TargetingButtonCallback = useCallback(() => {
    return <TargetingButton setShowTargetingModal={setShowTargetingModal} />;
  }, [setShowTargetingModal]);

  return useMemo(
    () => ({
      setShowTargetingModal,
      TargetingModal: TargetingModalCallback,
      TargetingButton: TargetingButtonCallback,
    }),
    [setShowTargetingModal, TargetingModalCallback, TargetingButtonCallback],
  );
}
