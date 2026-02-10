import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form";
import { AuthLayout } from "@/ui/layout/auth-layout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h3 className="text-center text-xl font-semibold">
          Reset your password
        </h3>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthLayout>
  );
}
