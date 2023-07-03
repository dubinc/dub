import { constructMetadata } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";
import PasswordForm from "./form";

const title = "Password Required";
const description =
  "This link is password protected. Please enter the password to view it.";
const image = "https://dub.sh/_static/password-protected.png";

export const metadata = constructMetadata({
  title,
  description,
  image,
});

export default function PasswordProtectedLinkPage() {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <a href="https://dub.sh" target="_blank" rel="noreferrer">
            <BlurImage
              src="/_static/logo.png"
              alt="Dub.sh logo"
              className="h-10 w-10 rounded-full"
              width={20}
              height={20}
            />
          </a>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <PasswordForm />
      </div>
    </main>
  );
}
