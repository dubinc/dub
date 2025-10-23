import { getSession } from "@/lib/auth";
import { CancelFlowEnterEmailModule } from "@/ui/cancellation-flow/auth/email/cancel-flow-enter-email.module";
import { NextPage } from "next";
import { redirect } from "next/navigation";

const pageName = "cancel_flow_enter_email";

const CancelFlowEnterEmail: NextPage = async () => {
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
