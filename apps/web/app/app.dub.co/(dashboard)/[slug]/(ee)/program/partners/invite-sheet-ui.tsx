import { GroupSelector } from "@/ui/partners/groups/group-selector";
import { X } from "@/ui/shared/icons";
import { Button, InfoTooltip, Sheet } from "@dub/ui";
import { UseFormRegisterReturn } from "react-hook-form";

export function InviteSheetHeader() {
  return (
    <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6 py-4">
        <Sheet.Title className="flex items-center gap-1 text-lg font-semibold">
          Invite partner{" "}
          <InfoTooltip
            content={
              "Invite influencers, affiliates, and users to your program, or enroll them automatically. [Learn more.](https://dub.co/help/article/inviting-partners)"
            }
          />
        </Sheet.Title>
        <Sheet.Close asChild>
          <Button
            variant="outline"
            icon={<X className="size-5" />}
            className="h-auto w-fit p-1"
          />
        </Sheet.Close>
      </div>
    </div>
  );
}

export function InviteSheetFooter({
  onCancel,
  isPending,
  isSubmitting,
  isSubmitDisabled,
}: {
  onCancel: () => void;
  isPending: boolean;
  isSubmitting: boolean;
  isSubmitDisabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
      <div className="flex items-center justify-end gap-2 p-5">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          text="Cancel"
          className="w-fit"
          disabled={isPending}
        />
        <Button
          type="submit"
          variant="primary"
          text="Send invite"
          className="w-fit"
          loading={isPending || isSubmitting}
          disabled={isPending || isSubmitting || isSubmitDisabled}
        />
      </div>
    </div>
  );
}

export function ShortLinkInput({
  domain,
  registration,
  id = "username",
  placeholder = "johndoe",
}: {
  domain?: string;
  registration: UseFormRegisterReturn;
  id?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
        {domain}
      </span>
      <input
        {...registration}
        type="text"
        id={id}
        className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

export function ShortLinkField({
  domain,
  registration,
}: {
  domain?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label
          htmlFor="username"
          className="block text-sm font-medium text-neutral-900"
        >
          Short link <span className="text-neutral-500">(optional)</span>
        </label>
      </div>

      <div className="mt-2">
        <ShortLinkInput domain={domain} registration={registration} />
      </div>
    </div>
  );
}

export function GroupField({
  optional,
  selectedGroupId,
  setSelectedGroupId,
}: {
  optional?: boolean;
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string) => void;
}) {
  return (
    <>
      <label className="block text-sm font-medium text-neutral-900">
        Group {optional && <span className="text-neutral-500">(optional)</span>}
      </label>

      <div className="relative mt-2 rounded-md shadow-sm">
        <GroupSelector
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
        />
      </div>
    </>
  );
}
