import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import BlurImage from "#/ui/blur-image";
import { AlertCircleFill } from "@/components/shared/icons";
import { LoadingDots } from "#/ui/icons";
import { FAVICON_FOLDER } from "@/lib/constants";

const title = "Password Required";
const description =
  "This link is password protected. Please enter the password to view it.";
const image = "/_static/password-protected.png";

export default function PasswordProtectedLinkPage() {
  const router = useRouter();
  const { domain, key } = router.query as { domain: string; key: string };
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href={`${FAVICON_FOLDER}/favicon-32x32.png`} />
      </Head>
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setValidating(true);
              fetch(`/api/auth/decrypt-password`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  domain,
                  key,
                  password,
                }),
              }).then(async (res) => {
                if (res.status === 200) {
                  const { url } = await res.json();
                  router.push(url);
                } else {
                  setValidating(false);
                  setError(true);
                }
              });
            }}
            className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
          >
            <div>
              <label htmlFor="password" className="block text-xs text-gray-600">
                PASSWORD
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  onChange={(e) => {
                    setError(false);
                    setPassword(e.target.value);
                  }}
                  className={`${
                    error
                      ? "border-red-300 text-red-500 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  } block w-full rounded-md pr-10 focus:outline-none sm:text-sm`}
                />
                {error && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <AlertCircleFill
                      className="h-5 w-5 text-red-500"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600" id="slug-error">
                  Incorrect password
                </p>
              )}
            </div>

            <button
              disabled={validating}
              className={`${
                validating
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-black bg-black text-white hover:bg-white hover:text-black"
              } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
            >
              {validating ? (
                <LoadingDots color="#808080" />
              ) : (
                <p>Authenticate</p>
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
