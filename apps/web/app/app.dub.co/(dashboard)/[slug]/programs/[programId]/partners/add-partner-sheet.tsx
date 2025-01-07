import { addPartnerAction } from "@/lib/actions/partners/add-partner";
import { mutatePrefix } from "@/lib/swr/mutate-prefix";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  BlurImage,
  Button,
  CircleCheckFill,
  Sheet,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface AddPartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface AddPartnerFormData {
  name?: string;
  email?: string;
  linkId: string;
}

const actionTypes = [
  {
    id: "invite",
    label: "Invite Partner",
    description: "Partner will be invited via email to join your program",
  },
  {
    id: "enroll",
    label: "Enroll Partner",
    description: "Partner is automatically enrolled to your program",
  },
];

function AddPartnerSheetContent({ setIsOpen }: AddPartnerSheetProps) {
  const { program } = useProgram();
  const { id: workspaceId, slug } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [selectedActionType, setSelectedActionType] = useState<
    "invite" | "enroll"
  >("invite");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AddPartnerFormData>();

  const selectedLinkId = watch("linkId");

  const { executeAsync, isExecuting } = useAction(addPartnerAction, {
    onSuccess: async () => {
      toast.success("Successfully invited partner!");
      setIsOpen(false);
      program && mutatePrefix(`/api/programs/${program.id}/partners`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const createLink = async (search: string) => {
    clearErrors("linkId");

    if (!search) throw new Error("No link entered");

    const shortKey = search.startsWith(program?.domain + "/")
      ? search.substring((program?.domain + "/").length)
      : search;

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

    setValue("linkId", result.id, { shouldDirty: true });

    return result.id;
  };

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await executeAsync({
          workspaceId: workspaceId!,
          programId: program?.id!,
          action: selectedActionType,
          name: data.name,
          email: data.email,
          linkId: data.linkId,
        });
      })}
      className="flex h-full flex-col"
    >
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {actionTypes.map((actionType) => {
              const isSelected = actionType.id === selectedActionType;

              return (
                <label
                  key={actionType.label}
                  className={cn(
                    "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                    "transition-all duration-150",
                    isSelected &&
                      "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  )}
                >
                  <input
                    type="radio"
                    value={actionType.label}
                    className="hidden"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedActionType(
                          actionType.id as "invite" | "enroll",
                        );
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">{actionType.label}</span>
                    <span className="text-xs text-gray-500">
                      {actionType.description}
                    </span>
                  </div>
                  <CircleCheckFill
                    className={cn(
                      "-mr-px -mt-px flex size-4 shrink-0 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                      isSelected && "scale-100 opacity-100",
                    )}
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4">
            {selectedActionType === "enroll" && (
              <div>
                <label htmlFor="name" className="flex items-center space-x-2">
                  <h2 className="text-sm font-medium text-gray-900">Name</h2>
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <input
                    {...register("name")}
                    className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                    placeholder="John Doe"
                    type="text"
                    autoComplete="off"
                    autoFocus={!isMobile}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="flex items-center space-x-2">
                <h2 className="text-sm font-medium text-gray-900">Email</h2>
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("email")}
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="panic@thedis.co"
                  type="email"
                  autoComplete="off"
                  autoFocus={!isMobile && selectedActionType !== "invite"}
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

              <AnimatedSizeContainer
                height
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="-m-1 mt-1"
              >
                <div className="p-1">
                  <PartnerLinkSelector
                    programDomain={program?.domain ?? undefined}
                    selectedLinkId={selectedLinkId}
                    setSelectedLinkId={(id) => {
                      clearErrors("linkId");
                      setValue("linkId", id, { shouldDirty: true });
                    }}
                    onCreate={async (search) => {
                      try {
                        await createLink(search);
                        return true;
                      } catch (error) {
                        toast.error(error?.message ?? "Failed to create link");
                      }
                      return false;
                    }}
                    domain={program?.domain ?? undefined}
                    error={!!errors.linkId}
                  />
                  {errors.linkId && (
                    <p className="mt-2 text-xs text-red-600">
                      {errors.linkId.message}
                    </p>
                  )}
                </div>
              </AnimatedSizeContainer>
            </div>
          </div>

          {selectedActionType === "invite" && (
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
                    {program?.name || "Dub"} uses Dub Partners to power their
                    partnership programs and wants to partner with great people
                    like yourself!
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
          )}
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
            disabled={isExecuting}
          />
          <Button
            type="submit"
            variant="primary"
            text="Send invite"
            className="w-fit"
            loading={isExecuting}
          />
        </div>
      </div>
    </form>
  );
}

export function AddPartnerSheet({
  isOpen,
  ...rest
}: AddPartnerSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <AddPartnerSheetContent {...rest} />
    </Sheet>
  );
}

export function useAddPartnerSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    addPartnerSheet: <AddPartnerSheet setIsOpen={setIsOpen} isOpen={isOpen} />,
    setIsOpen,
  };
}
