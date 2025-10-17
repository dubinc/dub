import { verifyWorkspaceSetup } from "@/lib/actions/verify-workspace-setup";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Button, Plug2 } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { CompleteStepButton } from "./complete-step-button";

type VerifyStatus = "pending" | "success" | "error";

const VerifyInstallIcon = ({ status }: { status: VerifyStatus }) => {
  return (
    <div
      className={cn(
        "text-content-default flex size-10 items-center justify-center rounded-full",
        status === "pending" && "border border-blue-200 bg-white",
        status === "error" && "bg-red-400 text-red-900",
        status === "success" && "bg-green-400 text-green-800",
      )}
    >
      <Plug2 className="size-4" />
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
  // const response: VerificationResponse | null = {
  //   verifiedAt: new Date(),
  //   verifiedBy: { name: "Ian" },
  // };

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

  const [complete, markComplete, { loading }] = useWorkspaceStore<boolean>(
    "analyticsSettingsConnectionSetupComplete",
  );

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

            <div className="text-content-emphasis mt-3 font-semibold">
              {error
                ? "Unable to connect"
                : response
                  ? "Successfully connected!"
                  : "Verify your install"}
            </div>

            <p className="text-content-emphasis text-sm font-medium">
              {error ? (
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
              ) : response ? (
                "You’re connected and ready to track conversions"
              ) : (
                "Test your connection to Dub"
              )}
            </p>
          </div>

          <div className="mt-4">
            {status !== "success" && (
              <Button
                text={isPending ? "Verifying..." : "Verify"}
                type="submit"
                loading={isPending}
                disabled={isPending}
                variant={status === "pending" ? "success" : "primary"}
              />
            )}

            {status === "success" && !complete && (
              <CompleteStepButton
                onClick={() => {
                  markComplete(true);
                }}
                loading={loading}
              />
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default VerifyInstall;
