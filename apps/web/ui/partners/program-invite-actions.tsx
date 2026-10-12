import { acceptProgramInviteAction } from "@/lib/actions/partners/accept-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import { ProgramEnrollmentProps } from "@/lib/types";
import { Button, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// "Learn more" and "Accept invite" for a program invitation
export function ProgramInviteActions({
  programEnrollment,
  className,
  buttonClassName,
}: {
  programEnrollment: ProgramEnrollmentProps;
  className?: string;
  buttonClassName?: string;
}) {
  const router = useRouter();
  const { program } = programEnrollment;

  const { executeAsync, isPending } = useAction(acceptProgramInviteAction, {
    onSuccess: async () => {
      await mutatePrefix("/api/partner-profile/programs");
      toast.success("Program invite accepted!");
      router.push(`/programs/${program.slug}`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Link
        className={cn(
          "flex h-8 items-center justify-center whitespace-nowrap rounded-md border px-2 text-sm",
          buttonVariants({ variant: "secondary" }),
          buttonClassName,
        )}
        href={`/programs/${program.slug}/invite`}
        onClick={(e) => e.stopPropagation()}
      >
        Learn more
      </Link>
      <Button
        text="Accept invite"
        className={cn("h-8", buttonClassName)}
        loading={isPending}
        onClick={async (e) => {
          e.stopPropagation();
          await executeAsync({
            programId: programEnrollment.programId,
          });
        }}
      />
    </div>
  );
}
