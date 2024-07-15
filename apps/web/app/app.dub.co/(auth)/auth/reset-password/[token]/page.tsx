import { Logo } from "@dub/ui";
import { HOME_DOMAIN } from "@dub/utils";
import { ResetPasswordForm } from "./form";

export default function ResetPasswordPage() {
  return (
    <div className="relative z-10 mt-[calc(30vh)] h-fit w-full max-w-md overflow-hidden border-y border-gray-200 sm:rounded-2xl sm:border sm:shadow-xl">
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
        <a href={HOME_DOMAIN}>
          <Logo className="h-10 w-10" />
        </a>
        <h3 className="text-xl font-semibold">Reset your password</h3>
        <p className="text-sm text-gray-500">
          Enter new password for your account.
        </p>
      </div>
      <div className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 sm:px-16">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
