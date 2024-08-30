import { AlertCircleFill, CheckCircleFill } from "@/ui/shared/icons";
import { Label, RadioGroup, RadioGroupItem, useMediaQuery } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import {
  FADE_IN_ANIMATION_SETTINGS,
  cn,
  getApexDomain,
  getSubdomain,
  getUrlFromString,
} from "@dub/utils";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

export default function DomainInput({
  identifier = "domain", // "domain" is the default, but when it's used in AddEditDomainModal, it's "slug"
  data,
  setData,
  domainError,
  setDomainError,
  showDomainTypeOptions = true,
}) {
  const domain = data[identifier];
  const originalDomain = useMemo(() => domain, []);
  const [debouncedDomain] = useDebounce(domain, 500);

  useEffect(() => {
    if (
      debouncedDomain.length > 0 &&
      debouncedDomain.toLowerCase() !== originalDomain.toLowerCase()
    ) {
      fetch(`/api/domains/${domain}/exists`).then(async (res) => {
        const exists = await res.json();
        setDomainError(exists === 1 ? "Domain is already in use." : null);
      });
    }
  }, [debouncedDomain]);

  const [domainType, setDomainType] = useState<string | undefined>(undefined);
  const apexDomain = useMemo(
    () => getApexDomain(getUrlFromString(domain)),
    [domain],
  );

  const { isMobile } = useMediaQuery();
  const domainRef = useRef<HTMLInputElement>(null);
  const subdomainRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (domainType === "website") {
      subdomainRef.current?.focus();
    }
  }, [domainType]);

  return (
    <>
      <div className="relative mt-2 flex rounded-md shadow-sm">
        {domainType === "website" ? (
          <div className="relative flex w-full rounded-md shadow-sm">
            <input
              ref={subdomainRef}
              name="subdomain"
              id="subdomain"
              type="text"
              required
              autoComplete="off"
              placeholder="subdomain"
              className="w-1/3 rounded-l-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              value={getSubdomain(domain, apexDomain) || ""}
              onChange={(e) => {
                setData({
                  ...data,
                  [identifier]: `${e.target.value}.${apexDomain}`,
                });
              }}
              aria-invalid="true"
            />
            <span className="inline-flex flex-1 items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
              .{apexDomain}
            </span>
          </div>
        ) : (
          <input
            ref={domainRef}
            name="domain"
            id="domain"
            type="text"
            required
            autoFocus={!isMobile && identifier === "slug"}
            autoComplete="off"
            pattern="[a-zA-Z0-9\-.]+"
            className={cn(
              "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              {
                "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500":
                  domainError,
              },
            )}
            placeholder="go.acme.com"
            value={domain}
            onChange={(e) => {
              setDomainError(null);
              setData({ ...data, [identifier]: e.target.value });
            }}
            aria-invalid="true"
          />
        )}
        {domainError ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <AlertCircleFill
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        ) : domainType === "spare" ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <CheckCircleFill
              className="h-5 w-5 text-green-500"
              aria-hidden="true"
            />
          </div>
        ) : null}
      </div>
      {domainError &&
        (domainError === "Domain is already in use." ? (
          <p className="mt-2 text-sm text-red-600" id="domain-error">
            Domain is already in use.{" "}
            <a
              className="underline"
              href="mailto:support@dub.co?subject=My Domain Is Already In Use"
            >
              Contact us
            </a>{" "}
            if you'd like to use this domain for your workspace.
          </p>
        ) : (
          <p className="mt-2 text-sm text-red-600" id="domain-error">
            {domainError}
          </p>
        ))}
      {domain && !domainError && showDomainTypeOptions && (
        <motion.div {...FADE_IN_ANIMATION_SETTINGS}>
          <RadioGroup
            className="mt-2"
            name="domainType"
            required
            value={domainType}
            onValueChange={(value) => {
              setDomainType(value);
            }}
          >
            <div className="flex items-center space-x-2 rounded-md border border-gray-300 bg-white transition-all hover:bg-gray-50 active:bg-gray-100">
              <RadioGroupItem value="spare" id="spare" className="ml-3" />
              <Label
                htmlFor="spare"
                className="flex flex-1 cursor-pointer items-center justify-between space-x-1 p-3 pl-0"
              >
                <p className="text-gray-600">This is a spare domain</p>
                <InfoTooltip content="If this is a separate domain that you're planning to use solely for short links, then you're good to go." />
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border border-gray-300 bg-white transition-all hover:bg-gray-50 active:bg-gray-100">
              <RadioGroupItem value="website" id="website" className="ml-3" />
              <Label
                htmlFor="website"
                className="flex flex-1 cursor-pointer items-center justify-between space-x-1 p-3 pl-0"
              >
                <p className="text-gray-600">This is our website's domain</p>
                <InfoTooltip content="If you're using this domain for your main website or app, you should be using a subdomain for your short links instead (e.g. go.acme.com)." />
              </Label>
            </div>
          </RadioGroup>
        </motion.div>
      )}
      {(domain.includes("/") || domainType === "website") && (
        <p className="mt-2 text-sm text-gray-500">
          Want to set up Dub.co to handle redirects on a subpath instead?{" "}
          <a
            href="https://dub.co/help/article/how-to-use-dub-with-subpath"
            target="_blank"
            className="underline"
          >
            Read this guide.
          </a>
        </p>
      )}
    </>
  );
}
