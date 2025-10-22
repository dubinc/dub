import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const CancellationPage = async () => {
  const authSession = await getSession();

  if (!authSession?.user) {
    redirect("/cancellation/auth");
  }

  return <div>CancellationPage</div>;
};

export default CancellationPage;
