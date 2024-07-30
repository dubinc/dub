import { constructMetadata } from "@dub/utils";
import VerifyOTPForm from "./form";

export const metadata = constructMetadata({
  title: `Create your ${process.env.NEXT_PUBLIC_APP_NAME} account`,
});

export default function VerifyOTPPage() {
  return <VerifyOTPForm />;
}
