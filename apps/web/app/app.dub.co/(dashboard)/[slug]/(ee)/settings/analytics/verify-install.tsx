import { verifyWorkspaceSetup } from "@/lib/actions/verify-workspace-setup";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Plug2 } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

type VerifyStatus = "pending" | "success" | "error";

const VerifyInstallIcon = ({ status }: { status: VerifyStatus }) => {
  return (
    <div
      className={cn(
        "flex size-[42px] items-center justify-center rounded-full",
        status === "pending" && "border border-blue-200 bg-white",
        status === "error" && "",
        status === "success" && "",
      )}
    >
      <Plug2 className="text-content-default size-[18px]" />
    </div>
  );
};

type VerificationResponse = {
  verifiedAt: Date;
  verifiedBy: { name: string; avatarUrl?: string };
};

const VerifyInstall = () => {
  const { id: workspaceId } = useWorkspace();

  //   const [verified, setVerified] = useState(false);

  const error: any | null = null;
  const response: VerificationResponse | null = null;
  //   const response: VerificationResponse | null = {
  //     verifiedAt: new Date(),
  //     verifiedBy: { name: "Ian" },
  //   };

  const { executeAsync, isPending } = useAction(verifyWorkspaceSetup, {
    async onSuccess(response) {
      toast.success("Account created! Redirecting to dashboard...");

      // if (response?.ok) {
      // } else {
      //   toast.error(
      //     "Failed to sign in with credentials. Please try again or contact support.",
      //   );
      // }
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const status: VerifyStatus = useMemo(() => {
    if (error) return "error";
    if (response) return "success";
    return "pending";
  }, [response, error]);

  const title = useMemo(() => {
    if (error) return "Unable to connect";
    if (response) return "Successfully connected!";
    return "Verify your install";
  }, [response, error]);

  const subtitle = useMemo(() => {
    if (error)
      return (
        <>
          Try again. For more help, see our{" "}
          <Link href={"/docs"} className="underline">
            docs
          </Link>{" "}
          or{" "}
          <Link href={"/contact"} className="underline">
            contact support
          </Link>
          .
        </>
      );
    if (response) return "You’re connected and ready to track conversions";
    return "Test your connection to Dub";
  }, [response, error]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-8 py-6",
        status === "pending" &&
          "border-blue-200 bg-gradient-to-b from-blue-50 to-white",
        status === "error" && "",
        status === "success" && "",
      )}
    >
      <form
        onSubmit={(e) => {
          if (!workspaceId) {
            return;
          }

          e.preventDefault();
          executeAsync({ workspaceId });
        }}
      >
        <div>
          <div className="flex flex-col items-center">
            <VerifyInstallIcon status={status} />

            <div className="text-content-emphasis font-semibold">{title}</div>

            <p className="text-content-emphasis text-sm font-medium">
              {subtitle}
            </p>
          </div>

          <Button
            className="mt-8"
            text={isPending ? "Verifying..." : "Verify"}
            type="submit"
            loading={isPending}
            disabled={isPending}
            variant={status === "pending" ? "success" : "primary"}
          />

          <motion.div
            animate={{
              height: !!response ? "auto" : 0,
              overflow: "hidden",
            }}
            transition={{
              duration: 0.15,
            }}
            initial={false}
          >
            Last verified by
          </motion.div>
        </div>
      </form>
    </div>
  );
};

export default VerifyInstall;
