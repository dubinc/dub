import { invitePartnerAction } from "@/lib/actions/partners/invite-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useDiscounts from "@/lib/swr/use-discounts";
import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { invitePartnerSchema } from "@/lib/zod/schemas/partners";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  BlurImage,
  Button,
  Eye,
  EyeSlash,
  InfoTooltip,
  Sheet,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils/src";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, memo, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface InvitePartnerSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

type InvitePartnerFormData = z.infer<typeof invitePartnerSchema>;

function InvitePartnerSheetContent({ setIsOpen }: InvitePartnerSheetProps) {
  const { program } = useProgram();
  const { isMobile } = useMediaQuery();
  const { id: workspaceId, slug } = useWorkspace();
  const { rewards, loading: rewardsLoading } = useRewards();
  const { discounts, loading: discountsLoading } = useDiscounts();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<InvitePartnerFormData>();

  const [name, email, linkId] = watch(["name", "email", "linkId"]);

  const { executeAsync, isPending } = useAction(invitePartnerAction, {
    onSuccess: async () => {
      toast.success("Invitation sent to partner!");
      setIsOpen(false);
      program &&
        mutatePrefix(
          `/api/partners?workspaceId=${workspaceId}&programId=${program.id}`,
        );
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
        programId: program?.id,
        folderId: program?.defaultFolderId,
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

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const onSubmit = async (data: InvitePartnerFormData) => {
    if (!workspaceId || !program?.id) {
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-900"
              >
                Name
              </label>

              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("name", { required: true })}
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="John Doe"
                  type="text"
                  autoComplete="off"
                  autoFocus={!isMobile}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-900"
              >
                Email
              </label>

              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  {...register("email", { required: true })}
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="panic@thedis.co"
                  type="email"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="linkId"
                    className="block text-sm font-medium text-neutral-900"
                  >
                    Referral link{" "}
                    <span className="text-neutral-500">(optional)</span>
                  </label>

                  <InfoTooltip content="Choose a referral link for this partner. If left empty, a unique referral link will be created for them automatically." />
                </div>

                <a
                  href={`/${slug}/program/settings/links`}
                  target="_blank"
                  className="text-sm text-neutral-500 underline-offset-2 hover:underline"
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
                    selectedLinkId={linkId || null}
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
                    error={!!errors.linkId}
                    optional
                  />

                  {errors.linkId && (
                    <p className="mt-2 text-xs text-red-600">
                      {errors.linkId.message}
                    </p>
                  )}
                </div>
              </AnimatedSizeContainer>
            </div>

            <div>
              <button
                type="button"
                className="flex w-full items-center gap-2"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <p className="text-sm text-neutral-600">
                  {showAdvancedOptions ? "Hide" : "Show"} advanced settings
                </p>
                <motion.div
                  animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
                  className="text-neutral-600"
                >
                  <ChevronDown className="size-4" />
                </motion.div>
              </button>

              <AnimatedSizeContainer height>
                {showAdvancedOptions && (
                  <div className="grid grid-cols-1 gap-6 py-6">
                    <div>
                      <label
                        htmlFor="rewardId"
                        className="block text-sm font-medium text-neutral-900"
                      >
                        Reward{" "}
                        <span className="text-neutral-500">(optional)</span>
                      </label>

                      <div className="relative mt-2 rounded-md p-px shadow-sm">
                        <select
                          className={cn(
                            "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.rewardId && "border-red-600",
                            rewardsLoading && "opacity-50",
                          )}
                          {...register("rewardId")}
                          disabled={rewardsLoading}
                        >
                          <option value="">Select a reward</option>
                          {rewards?.map((reward) => (
                            <option value={reward.id} key={reward.id}>
                              {reward.name ||
                                formatRewardDescription({ reward })}{" "}
                              {reward.default && "(Default)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="discountId"
                        className="block text-sm font-medium text-neutral-900"
                      >
                        Discount{" "}
                        <span className="text-neutral-500">(optional)</span>
                      </label>

                      <div className="relative mt-2 rounded-md p-px shadow-sm">
                        <select
                          className={cn(
                            "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            errors.discountId && "border-red-600",
                            discountsLoading && "opacity-50",
                          )}
                          {...register("discountId")}
                          disabled={discountsLoading}
                        >
                          <option value="">Select a discount</option>
                          {discounts?.map((discount) => (
                            <option value={discount.id} key={discount.id}>
                              {formatDiscountDescription({ discount })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatedSizeContainer>
            </div>
          </div>

          <EmailPreview />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="w-fit"
            disabled={isPending}
          />
          <Button
            type="submit"
            variant="primary"
            text="Send invite"
            className="w-fit"
            loading={isPending}
            disabled={isPending || !name || !email}
          />
        </div>
      </div>
    </form>
  );
}

function EmailPreview() {
  const { program } = useProgram();

  const [showPreview, setShowPreview] = useLocalStorage(
    "show-partner-invite-email-preview",
    true,
  );

  return (
    <div className="mt-8 rounded-md border border-neutral-200 bg-neutral-100 p-2 pt-2.5">
      <div className="flex justify-between px-2">
        <h2 className="text-sm font-medium text-neutral-900">Email preview</h2>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors duration-100 hover:text-neutral-600"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <EyeSlash className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {showPreview ? "Hide" : "Show"}
        </button>
      </div>
      <motion.div
        animate={{
          height: showPreview ? "auto" : 0,
        }}
        className="overflow-hidden"
      >
        <div className="mt-2 overflow-hidden rounded-md border border-neutral-200 bg-white">
          <div className="grid grid-cols-1 gap-4 p-6 pb-10">
            <MemoBlurImage
              src={program?.logo || "https://assets.dub.co/logo.png"}
              alt={program?.name || "Dub"}
              className="my-2 size-8 rounded-full"
              width={48}
              height={48}
            />
            <h3 className="font-medium text-neutral-900">
              {program?.name || "Dub"} invited you to join Dub Partners
            </h3>
            <p className="text-sm text-neutral-500">
              {program?.name || "Dub"} uses Dub Partners to power their
              affiliate program and wants to partner with great people like
              yourself!
            </p>
            <Button type="button" text="Accept invite" className="w-fit" />
          </div>
          <div className="grid gap-1 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
            <p className="text-sm text-neutral-500">
              <strong className="font-medium text-neutral-900">From: </strong>
              system@dub.co
            </p>
            <p className="text-sm text-neutral-500">
              <strong className="font-medium text-neutral-900">
                Subject:{" "}
              </strong>
              You've been invited to Dub Partners
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const MemoBlurImage = memo(BlurImage);

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
