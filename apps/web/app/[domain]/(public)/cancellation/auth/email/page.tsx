import { getSession } from "@/lib/auth";
import { CancelFlowEnterEmailModule } from "@/ui/cancellation-flow/auth/email/cancel-flow-enter-email.module";
import { redirect } from "next/navigation";

const CancelFlowEnterEmail = async () => {
  const authSession = await getSession();

  if (authSession?.user) {
    redirect("/cancellation");
  }

  return (
    <>
      <CancelFlowEnterEmailModule />
    </>
  );
};

export default CancelFlowEnterEmail;
