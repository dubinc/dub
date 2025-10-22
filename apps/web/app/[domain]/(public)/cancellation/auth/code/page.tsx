import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const CancellationAuthCodePage = async () => {
  const authSession = await getSession();

  if (authSession?.user) {
    redirect("/cancellation");
  }

  return <div>CancellationAuthCodePage</div>;
};

export default CancellationAuthCodePage;
