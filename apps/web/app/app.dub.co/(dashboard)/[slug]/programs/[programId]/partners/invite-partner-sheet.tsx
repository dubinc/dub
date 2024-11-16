import { invitePartnerAction } from "@/lib/actions/invite-partner";
import useLinks from "@/lib/swr/use-links";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  BlurImage,
  Button,
  CircleCheckFill,
  Combobox,
  LinkLogo,
  Sheet,
} from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/src/icons";
import { cn, getApexDomain, linkConstructor } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

interface InvitePartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface InvitePartnerFormData {
  email: string;
  linkId: string;
}

function InvitePartnerSheetContent({ setIsOpen }: InvitePartnerSheetProps) {
  const { program } = useProgram();
  const { id: workspaceId, slug } = useWorkspace();
  const [shortKey, setShortKey] = useState("");
  const [useExistingLink, setUseExistingLink] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<InvitePartnerFormData>({
    defaultValues: {
      email: "",
      linkId: "",
    },
  });

  const selectedLinkId = watch("linkId");

  const { executeAsync, isExecuting } = useAction(invitePartnerAction, {
    onSuccess: async () => {
      toast.success("Successfully invited partner!");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  useEffect(() => {
    // set link slug based on email name
    const email = watch("email");
    if (email) setShortKey(email.split("@")[0]);
  }, [watch("email")]);

  const createLink = async () => {
    if (!shortKey) {
      setError("linkId", { message: "Please enter short key for the link" });
      return;
    }

    const response = await fetch(`/api/links?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: program?.domain,
        key: shortKey,
        url: program?.url,
        trackConversion: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const { error } = result;
      throw new Error(error.message);
    }

    setValue("linkId", result.id);

    return result.id;
  };

  const onSubmit = async (data: InvitePartnerFormData) => {
    let { linkId } = data;

    try {
      if (!linkId) {
        setCreatingLink(true);
        linkId = await createLink();
      }

      if (!linkId) return;

      await executeAsync({
        workspaceId: workspaceId!,
        programId: program?.id!,
        email: data.email,
        linkId,
      });
    } catch (error) {
      if (error.message.includes("key"))
        setError("linkId", { message: error.message });
      else toast.error(error.message);
    } finally {
      setCreatingLink(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div>
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            Invite partner
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
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">Email</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("email")}
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="panic@thedis.co"
                  required
                  type="email"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900">
                  Referral link
                </h2>
                <a
                  href={`/${slug}/programs/${program?.id}/settings`}
                  target="_blank"
                  className="text-sm text-gray-500 underline-offset-2 hover:underline"
                >
                  Settings
                </a>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "New",
                    description: "Create a new referral link",
                    value: false,
                  },
                  {
                    label: "Existing",
                    description: "Select an existing referral link",
                    value: true,
                  },
                ].map(({ label, description, value }) => (
                  <label
                    key={label}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-start gap-0.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-600 hover:bg-neutral-50",
                      "transition-all duration-150",
                      useExistingLink === value &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={label}
                      className="hidden"
                      checked={useExistingLink === value}
                      onChange={(e) => {
                        if (e.target.checked) setUseExistingLink(value);
                      }}
                    />
                    <div className="flex grow flex-col text-sm">
                      <span className="font-medium leading-tight">{label}</span>
                      <span>{description}</span>
                    </div>
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        useExistingLink === value && "scale-100 opacity-100",
                      )}
                    />
                  </label>
                ))}
              </div>

              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="-m-1 mt-2"
              >
                <div className="p-1">
                  {useExistingLink ? (
                    <LinksSelector
                      selectedLinkId={selectedLinkId}
                      setSelectedLinkId={(id) =>
                        setValue("linkId", id, { shouldDirty: true })
                      }
                    />
                  ) : (
                    <>
                      <div className="relative flex rounded-md shadow-sm">
                        <div>
                          <div className="group flex h-full items-center justify-start gap-2 whitespace-nowrap rounded-md rounded-r-none border border-gray-300 border-r-transparent bg-white px-3 text-sm text-gray-900 outline-none transition-none sm:inline-flex">
                            <div className="flex w-full min-w-0 items-center justify-start truncate px-2">
                              {program?.domain}
                            </div>
                          </div>
                        </div>

                        <input
                          pattern="[\p{L}\p{N}\p{Pd}\/\p{Emoji}_.]+"
                          autoComplete="off"
                          autoCapitalize="none"
                          className={cn(
                            "block h-10 w-full rounded-r-md border-gray-300 text-gray-900 placeholder-gray-400 focus:z-[1] focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                            errors.linkId && "border-red-500",
                          )}
                          placeholder=""
                          type="text"
                          name="key"
                          value={shortKey}
                          onChange={(e) => {
                            setValue("linkId", "");
                            clearErrors("linkId");
                            setShortKey(e.target.value);
                          }}
                        />
                      </div>
                      {errors.linkId ? (
                        <p className="mt-2 text-xs text-red-600">
                          {errors.linkId.message}
                        </p>
                      ) : (
                        program?.url && (
                          <div className="ml-2 mt-2 flex items-center gap-1 text-xs text-gray-500">
                            <ArrowTurnRight2 className="size-3 shrink-0" />
                            <span className="min-w-0 truncate">
                              Destination URL:{" "}
                              <a
                                href={program.url}
                                target="_blank"
                                className="underline-offset-2 hover:underline"
                              >
                                {program.url}
                              </a>
                            </span>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </AnimatedSizeContainer>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-medium text-gray-900">Preview</h2>
              <div className="mt-2 overflow-hidden rounded-md border border-neutral-200">
                <div className="grid gap-4 p-6 pb-10">
                  <BlurImage
                    src={program?.logo || "https://assets.dub.co/logo.png"}
                    alt={program?.name || "Dub"}
                    className="my-2 size-8 rounded-full"
                    width={48}
                    height={48}
                  />
                  <h3 className="font-medium text-gray-900">
                    {program?.name || "Dub"} invited you to join Dub Partners
                  </h3>
                  <p className="text-sm text-gray-500">
                    {program?.name || "Dub"} uses Dub to power their partnership
                    programs and wants to partner with great people like
                    yourself!
                  </p>
                  <Button
                    type="button"
                    text="Accept invite"
                    className="w-fit"
                  />
                </div>
                <div className="grid gap-1 border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <p className="text-sm text-gray-500">
                    <strong className="font-medium text-gray-900">
                      From:{" "}
                    </strong>
                    system@dub.co
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong className="font-medium text-gray-900">
                      Subject:{" "}
                    </strong>
                    You've been invited to Dub Partners
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isExecuting || creatingLink}
          />
          <Button
            type="submit"
            variant="primary"
            text="Send invite"
            className="w-fit"
            loading={isExecuting || creatingLink}
          />
        </div>
      </div>
    </form>
  );
}

const getLinkOption = (link: LinkProps) => ({
  value: link.id,
  label: linkConstructor({ ...link, pretty: true }),
  icon: (
    <LinkLogo
      apexDomain={getApexDomain(link.url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ),
  meta: {
    url: link.url,
  },
});

function LinksSelector({
  selectedLinkId,
  setSelectedLinkId,
}: {
  selectedLinkId: string;
  setSelectedLinkId: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { links } = useLinks(
    { search: debouncedSearch },
    {
      keepPreviousData: false,
    },
  );

  const options = useMemo(
    () => links?.map((link) => getLinkOption(link)),
    [links],
  );

  const selectedLink = links?.find((l) => l.id === selectedLinkId);

  return (
    <>
      <Combobox
        selected={options?.find((o) => o.value === selectedLinkId) ?? null}
        setSelected={(option) => {
          if (option) setSelectedLinkId(option.value);
        }}
        options={options}
        caret={true}
        placeholder="Select referral link"
        searchPlaceholder="Search..."
        matchTriggerWidth
        onSearchChange={setSearch}
        buttonProps={{
          className: cn(
            "w-full justify-start border-gray-300 px-3 shadow-sm",
            "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
            "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
            !selectedLinkId && "text-gray-400",
          ),
        }}
        shouldFilter={false}
      />
      {selectedLink?.url && (
        <div className="ml-2 mt-2 flex items-center gap-1 text-xs text-gray-500">
          <ArrowTurnRight2 className="size-3 shrink-0" />
          <span className="min-w-0 truncate">
            Destination URL:{" "}
            <a
              href={selectedLink.url}
              target="_blank"
              className="underline-offset-2 hover:underline"
            >
              {selectedLink.url}
            </a>
          </span>
        </div>
      )}
    </>
  );
}

export function InvitePartnerSheet({
  isOpen,
  ...rest
}: InvitePartnerSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <InvitePartnerSheetContent {...rest} />
    </Sheet>
  );
}

export function useInvitePartnerSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    invitePartnerSheet: (
      <InvitePartnerSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
