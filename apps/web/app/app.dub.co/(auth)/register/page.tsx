import AuthLayout from "@/ui/layout/auth-layout";
import { constructMetadata } from "@dub/utils";
import { RegisterForm } from "./form";

export const metadata = constructMetadata({
  title: `Create your ${process.env.NEXT_PUBLIC_APP_NAME} account`,
});

export default function RegisterPage() {
  return (
    <AuthLayout variant="register">
      <RegisterForm />
    </AuthLayout>
  );
}
