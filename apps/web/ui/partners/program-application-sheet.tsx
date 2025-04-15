"use client";

import {
  createProgramApplicationAction,
  createProgramApplicationSchema,
} from "@/lib/actions/partners/create-program-application";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { ProgramProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface ProgramApplicationSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  program?: ProgramProps;
}

type FormData = Omit<
  z.infer<typeof createProgramApplicationSchema>,
  "name" | "email" | "website"
>;

function ProgramApplicationSheetContent({
  setIsOpen,
  program,
}: ProgramApplicationSheetProps) {
  const { partner } = usePartnerProfile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const { executeAsync, isPending } = useAction(
    createProgramApplicationAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Reward created!");
        // await mutateProgram();
        // await mutatePrefix(`/api/programs/${program?.id}/rewards`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: FormData) => {
    if (!program || !partner?.email) return;

    const payload = {
      ...data,
      email: partner.email,
      name: partner.name,
      website: partner.website ?? undefined,
    };

    await executeAsync(payload);
  };

  if (!program) return null;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex items-start justify-between bg-neutral-50 p-6">
          <Sheet.Title asChild className="min-w-0">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                  alt={program.name}
                  className="size-10 rounded-full border border-black/10"
                />
                <div className="min-w-0">
                  <span className="block truncate text-base font-semibold leading-tight text-neutral-900">
                    {program.name}
                  </span>

                  <span className="block truncate text-sm font-medium leading-tight text-neutral-500">
                    {program.domain}
                  </span>
                </div>
              </div>
            </div>
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="p-8"></div>

        <div className="flex grow flex-col justify-end p-5">
          <Button
            type="submit"
            variant="primary"
            text="Submit application"
            loading={isPending}
            disabled={false}
          />
        </div>
      </form>
    </>
  );
}

export function ProgramApplicationSheet({
  isOpen,
  nested,
  ...rest
}: ProgramApplicationSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <ProgramApplicationSheetContent {...rest} />
    </Sheet>
  );
}

export function useProgramApplicationSheet(
  props: Omit<ProgramApplicationSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    programApplicationSheet: (
      <ProgramApplicationSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
