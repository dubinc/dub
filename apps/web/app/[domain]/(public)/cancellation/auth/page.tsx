import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const CancellationAuthPage = async () => {
  const authSession = await getSession();

  if (authSession?.user) {
    return redirect("/cancellation");
  }

  return redirect("/cancellation/auth/email");
};

export default CancellationAuthPage;
