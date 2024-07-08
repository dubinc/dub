import { ArrowTurnRight2, Flag2, Globe } from "@dub/ui/src/icons";
import { punycode } from "@dub/utils";

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
  return (
    <div className="flex items-center gap-4">
      <div className="hidden rounded-full border border-gray-200 sm:block">
        <div className="rounded-full border border-white bg-gradient-to-t from-gray-100 p-1 md:p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <a
            href={`http://${domain}`}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium"
            title={punycode(domain)}
          >
            {punycode(domain)}
          </a>

          {primary && (
            <span className="flex items-center gap-1 rounded-full bg-sky-400/[.15] px-3 py-1 text-xs font-medium text-sky-600">
              <Flag2 className="hidden h-3 w-3 sm:block" />
              Primary
            </span>
          )}
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
                    <span className="truncate text-gray-500" title={url}>
                      {url}
                    </span>
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
