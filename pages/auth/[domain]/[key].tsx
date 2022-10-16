import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import BlurImage from "@/components/shared/blur-image";
import { AlertCircleFill, LoadingDots } from "@/components/shared/icons";
import { FAVICON_FOLDER } from "@/lib/constants";
import prisma from "@/lib/prisma";

const title = "Password Required";
const description =
  "This link is password protected. Please enter the password to view it.";
const image = "/static/password-protected.png";

export default function PasswordProtectedLinkPage() {
  const router = useRouter();
  const { domain, key } = router.query as { domain: string; key: string };
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <>
      <Head>
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <link rel="icon" href={`${FAVICON_FOLDER}/favicon-32x32.png`} />
      </Head>
      <main className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col justify-center items-center space-y-3 text-center sm:px-16 px-4 pt-8 py-6 border-b border-gray-200 bg-white">
            <a href="https://dub.sh" target="_blank" rel="noreferrer">
              <BlurImage
                src="/static/logo.png"
                alt="Dub.sh logo"
                className="w-10 h-10 rounded-full"
                width={20}
                height={20}
              />
            </a>
            <h3 className="font-semibold text-xl">{title}</h3>
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
            className="flex flex-col space-y-4 bg-gray-50 sm:px-16 px-4 py-8"
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
                  } pr-10 block w-full rounded-md focus:outline-none sm:text-sm`}
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
                  ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                  : "bg-black hover:bg-white hover:text-black border-black text-white"
              } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
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

export function getStaticPaths() {
  return {
    paths: [],
    fallback: "blocking",
  };
}

export async function getStaticProps(ctx) {
  const { domain, key } = ctx.params as { domain: string; key: string };
  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    select: {
      url: true,
      passwordHash: true,
    },
  });

  const { url, passwordHash } = link || {};

  if (!url) {
    return {
      notFound: true,
      revalidate: 1,
    };
  } else if (!passwordHash) {
    return {
      redirect: {
        destination: url,
      },
      revalidate: 1,
    };
  }

  return {
    props: {},
    revalidate: 1,
  };
}
