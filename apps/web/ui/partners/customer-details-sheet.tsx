import useWorkspace from "@/lib/swr/use-workspace";
import { Customer } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { Dispatch, SetStateAction } from "react";

interface CustomerDetailsSheetProps {
  customer: Customer;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function CustomerDetailsSheetContent({
  customer,
  setIsOpen,
}: CustomerDetailsSheetProps) {
  const { slug } = useWorkspace();

  return (
    <>
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Customer details
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-6">
            {/* <div className="flex flex-col">
              <img
                src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-12 rounded-full"
              />
              <div className="mt-4 flex items-start gap-2">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {partner.name}
                </span>
                {badge && (
                  <StatusBadge icon={null} variant={badge.variant}>
                    {badge.label}
                  </StatusBadge>
                )}
              </div>
            </div> */}

            {/* <div className="flex min-w-[40%] shrink grow basis-1/2 flex-wrap items-center justify-end gap-2">
              {partner.link && (
                <a
                  href={`/${slug}/analytics?domain=${partner.link.domain}&key=${partner.link.key}`}
                  target="_blank"
                  className="group flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700 transition-colors duration-100 hover:bg-neutral-200/70 active:bg-neutral-200"
                >
                  <LinesY className="size-3.5" />
                  <span className="truncate">
                    {getPrettyUrl(partner.link.shortLink)}
                  </span>
                </a>
              )}
              {partner.country && (
                <div className="flex min-w-20 items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${partner.country}.svg`}
                    className="h-3 w-4"
                  />
                  <span className="truncate">{COUNTRIES[partner.country]}</span>
                </div>
              )}
            </div> */}
          </div>

          <div className="mt-6 flex divide-x divide-neutral-200"></div>
        </div>
      </div>

      <div className="flex grow flex-col justify-end">
        <div className="border-t border-neutral-200 p-5"></div>
      </div>
    </>
  );
}

export function CustomerDetailsSheet({
  isOpen,
  ...rest
}: CustomerDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
    >
      <CustomerDetailsSheetContent {...rest} />
    </Sheet>
  );
}
