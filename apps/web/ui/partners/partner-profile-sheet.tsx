import { EnrolledPartnerProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { COUNTRIES, OG_AVATAR_URL } from "@dub/utils";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { OnlinePresenceSummary } from "./online-presence-summary";

type PartnerProfileSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerProfileSheetContent({
  partner,
  setIsOpen,
}: PartnerProfileSheetProps) {
  const basicFields = useMemo(
    () => [
      {
        title: "Name",
        content: partner.name,
        right: (
          <img
            src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
            alt={partner.name}
            className="size-10 rounded-full"
          />
        ),
      },
      {
        title: "Email",
        content: partner.email,
      },
      {
        title: "Location",
        content: partner.country ? (
          <div className="flex items-center gap-2">
            <img
              alt=""
              src={`https://flag.vercel.app/m/${partner.country}.svg`}
              className="h-3 w-4 shrink-0"
            />
            <span className="min-w-0 truncate">
              {COUNTRIES[partner.country]}
            </span>
          </div>
        ) : (
          <span className="italic text-neutral-400">No location provided</span>
        ),
      },
      {
        title: "Description",
        content: partner.description || (
          <span className="italic text-neutral-400">
            No description provided
          </span>
        ),
      },
    ],
    [partner],
  );

  return (
    <>
      <div className="flex grow flex-col">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Partner profile
          </Sheet.Title>
          <div className="flex items-center gap-2">
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>
        <div className="border-t border-neutral-200 p-6 text-sm text-neutral-600">
          <div className="grid grid-cols-1 gap-4">
            {basicFields.map((field) => (
              <div
                key={field.title}
                className="flex items-start justify-between"
              >
                <div>
                  <h4 className="font-semibold text-neutral-900">
                    {field.title}
                  </h4>
                  <div className="mt-2">{field.content}</div>
                </div>
                {field.right}
              </div>
            ))}
            <hr className="my-4 border-neutral-200" />
            <div>
              <h4 className="font-semibold text-neutral-900">
                Online presence
              </h4>
              <OnlinePresenceSummary partner={partner} className="mt-3" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PartnerProfileSheet({
  isOpen,
  nested,
  ...rest
}: PartnerProfileSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
      nested={nested}
    >
      <PartnerProfileSheetContent {...rest} />
    </Sheet>
  );
}

export function usePartnerProfileSheet(
  props: { nested?: boolean } & Omit<PartnerProfileSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    partnerProfileSheet: (
      <PartnerProfileSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
