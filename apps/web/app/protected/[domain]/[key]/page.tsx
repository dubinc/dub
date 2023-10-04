import { constructMetadata } from "#/lib/utils";
import Background from "#/ui/home/background";
import { Logo } from "#/ui/icons";
import PasswordForm from "./form";

const title = "Password Required";
const description =
  "This link is password protected. Please enter the password to view it.";
const image = "https://dub.co/_static/password-protected.png";

export const metadata = constructMetadata({
  title,
  description,
  image,
  noIndex: true,
});

export default function PasswordProtectedLinkPage() {
  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <Background />
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <a href="https://dub.co" target="_blank" rel="noreferrer">
            <Logo />
          </a>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <PasswordForm />
      </div>
    </main>
  );
}
