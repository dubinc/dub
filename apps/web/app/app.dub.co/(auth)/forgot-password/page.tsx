import AuthLayout from "@/ui/layout/old-auth-layout";
import { constructMetadata } from "@dub/utils";
import { ForgotPasswordForm } from "./form";

export const metadata = constructMetadata({
  title: `Forgot Password for ${process.env.NEXT_PUBLIC_APP_NAME}`,
});

export default function ForgotPasswordPage() {
  return (
    <AuthLayout variant="login" heading="Reset your Dub password">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
