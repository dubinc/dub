import {
  AnimatedSizeContainer,
  InfoTooltip,
  SimpleTooltipContent,
  useKeyboardShortcut,
} from "@dub/ui";
import {
  Flag6,
  GlobePointer,
  InputSearch,
  LinkBroken,
  Page2,
  SatelliteDish,
} from "@dub/ui/src/icons";
import { cn, constructURLFromUTMParams, getParamsFromURL } from "@dub/utils";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

const parameters = [
  {
    key: "utm_source",
    icon: GlobePointer,
    label: "Source",
    placeholder: "google",
    shortcut: "S",
  },
  {
    key: "utm_medium",
    icon: SatelliteDish,
    label: "Medium",
    placeholder: "cpc",
    shortcut: "M",
  },
  {
    key: "utm_campaign",
    icon: Flag6,
    label: "Campaign",
    placeholder: "summer_sale",
    shortcut: "C",
  },
  {
    key: "utm_term",
    icon: InputSearch,
    label: "Term",
    placeholder: "running shoes",
    shortcut: "T",
  },
  {
    key: "utm_content",
    icon: Page2,
    label: "Content",
    placeholder: "logolink",
    shortcut: "O",
  },
  {
    key: "ref",
    icon: LinkBroken,
    label: "Referral",
    placeholder: "google",
    shortcut: "R",
  },
];

export function UTMBuilder() {
  const id = useId();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const url = watch("url");

  const isValidUrl = useMemo(() => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }, [url]);

  const params = useMemo(() => getParamsFromURL(url), [url]);

  const [toggledParams, setToggledParams] = useState<string[]>(
    parameters.filter(({ key }) => params[key]).map(({ key }) => key),
  );
  const [justToggled, setJustToggled] = useState<string | null>(null);

  const enabledParameters = useMemo(() => {
    return parameters.filter(
      ({ key }) => params[key] || toggledParams.includes(key),
    );
  }, [params, toggledParams]);

  const toggleParameter = useCallback(
    (key: string) => {
      const enabled = Boolean(params[key]) || toggledParams.includes(key);

      if (!enabled) {
        setToggledParams((prev) => [...prev, key]);
        setJustToggled(key);
      } else {
        setToggledParams((prev) => prev.filter((k) => k !== key));
        setValue(key as any, "", { shouldDirty: true });
        setValue(
          "url",
          constructURLFromUTMParams(url, {
            ...params,
            [key]: "",
          }),
          { shouldDirty: true },
        );
      }
    },
    [params, toggledParams, url],
  );

  // Focus the input after toggling (with preventScroll to avoid scrolling the AnimatedSizeContainer)
  useEffect(() => {
    if (justToggled) {
      const input = document.getElementById(`${id}-${justToggled}`);
      if (input) input.focus({ preventScroll: true });
      setJustToggled(null);
    }
  }, [justToggled]);

  useKeyboardShortcut(
    parameters.map(({ shortcut }) => shortcut),
    (e) => {
      const parameter = parameters.find(({ shortcut }) => shortcut === e.key);
      if (!parameter) return;
      toggleParameter(parameter.key);
    },
    {
      modal: true,
    },
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="block text-sm font-medium text-gray-700">
          UTM Builder
        </span>
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
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {parameters.map(({ key, icon: Icon, label }) => {
          const enabled = Boolean(params[key]) || toggledParams.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={enabled}
              disabled={!isValidUrl}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-sm drop-shadow-sm transition-all",
                "rounded-md border border-gray-300 bg-white text-gray-700",
                "disabled:pointer-events-none disabled:opacity-70",
                enabled
                  ? "border-gray-600 bg-gray-100 ring-1 ring-inset ring-gray-600"
                  : "hover:bg-gray-50 active:bg-gray-100",
              )}
              onClick={() => toggleParameter(key)}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <AnimatedSizeContainer
        height
        transition={{ ease: "easeInOut", duration: 0.1 }}
        className="-mx-1 px-1"
      >
        <div
          className={cn(
            "grid grid-cols-[min-content_1fr] gap-y-2 text-sm text-gray-700",
            enabledParameters.length > 0 && "pb-1 pt-6",
          )}
        >
          {enabledParameters.map(({ key, icon: Icon, placeholder }) => {
            return (
              <Fragment key={key}>
                <div className="flex items-center gap-1.5 rounded-l-md border-y border-l border-gray-300 bg-gray-100 py-2.5 pl-2 pr-3 sm:min-w-36">
                  <Icon className="size-4 shrink-0" />
                  <label htmlFor={`${id}-${key}`} className="font-mono text-sm">
                    {key}
                  </label>
                </div>
                <input
                  type="text"
                  id={`${id}-${key}`}
                  placeholder={placeholder}
                  className="h-full grow rounded-r-md border border-gray-300 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
                  value={params[key] || ""}
                  onChange={(e) => {
                    setValue(key as any, e.target.value, { shouldDirty: true });
                    setValue(
                      "url",
                      constructURLFromUTMParams(url, {
                        ...params,
                        [key]: e.target.value,
                      }),
                      { shouldDirty: true },
                    );
                  }}
                />
              </Fragment>
            );
          })}
        </div>
      </AnimatedSizeContainer>
    </div>
  );
}
