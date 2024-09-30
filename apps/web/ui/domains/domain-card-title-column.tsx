import { ArrowTurnRight2, Flag2, Globe } from "@dub/ui/src/icons";
import { cn, getPrettyUrl, isValidUrl, punycode } from "@dub/utils";
import { Star } from "lucide-react";

export function DomainCardTitleColumn({
  domain,
  icon: Icon = Globe,
  url,
  description,
  primary = false,
  defaultDomain = false,
}: {
  domain: string;
  icon?: React.ElementType;
  url?: string | null;
  description?: string;
  primary?: boolean;
  defaultDomain?: boolean;
}) {
  const isDomainUrl = isValidUrl(`http://${domain}`);
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="hidden rounded-full border border-gray-200 sm:block">
        <div
          className={cn(
            "rounded-full",
            !defaultDomain &&
              "border border-white bg-gradient-to-t from-gray-100 p-1 md:p-3",
          )}
        >
          <Icon className={cn("size-5", defaultDomain && "size-8")} />
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {isDomainUrl ? (
            <a
              href={`http://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium"
              title={punycode(domain)}
            >
              {punycode(domain)}
            </a>
          ) : (
            <div className="truncate text-sm font-medium">{domain}</div>
          )}

          {primary ? (
            <span className="xs:px-3 xs:py-1 flex items-center gap-1 rounded-full bg-sky-400/[.15] px-1.5 py-0.5 text-xs font-medium text-sky-600">
              <Flag2 className="hidden h-3 w-3 sm:block" />
              Primary
            </span>
          ) : defaultDomain && domain === "dub.link" ? (
            <span className="xs:px-3 xs:py-1 flex items-center gap-1 rounded-full bg-yellow-400/[.25] px-1.5 py-0.5 text-xs font-medium text-yellow-600">
              <Star className="h-3 w-3" fill="currentColor" />
              Premium
            </span>
          ) : null}
        </div>
        {(!defaultDomain || description) && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {description ? (
              <span
                className="whitespace-pre-wrap text-gray-500"
                title={description}
              >
                {description}
              </span>
            ) : (
              <>
                <ArrowTurnRight2 className="h-3 w-3 text-gray-400" />
                {url !== undefined ? (
                  url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-gray-500 transition-all hover:text-gray-700 hover:underline hover:underline-offset-2"
                    >
                      {getPrettyUrl(url)}
                    </a>
                  ) : (
                    <span className="truncate text-gray-400">
                      No redirect configured
                    </span>
                  )
                ) : (
                  <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200" />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
