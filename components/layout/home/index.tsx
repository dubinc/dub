import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Github, Logo, Twitter } from "@/components/shared/icons";
import Meta from "../meta";
import { motion, AnimatePresence } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "@/lib/constants";

export default function HomeLayout({
  meta,
  children,
}: {
  meta?: {
    title?: string;
    description?: string;
    image?: string;
  };
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { key } = router.query as { key?: string };

  const [hostname, setHostname] = useState("dub.sh");
  useEffect(() => {
    setHostname(window.location.origin);
  }, []);

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Meta {...meta} />
      <div className={`${key ? "bg-gray-50" : ""} z-20`}>
        <div className="mx-auto max-w-screen-xl px-5 md:px-20">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href={hostname === "dub.sh" ? "/" : `https://dub.sh/`}>
                <Image
                  src="/_static/logotype.svg"
                  alt="Dub.sh logo"
                  width={834}
                  height={236}
                  className="w-24"
                />
              </Link>
            </div>

            <AnimatePresence>
              {!session && status !== "loading" ? (
                <motion.a
                  {...FADE_IN_ANIMATION_SETTINGS}
                  href="https://app.dub.sh/login"
                  className="rounded-full border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
                >
                  Sign in
                </motion.a>
              ) : (
                <motion.a
                  {...FADE_IN_ANIMATION_SETTINGS}
                  href="https://app.dub.sh"
                  className="rounded-full border border-black bg-black py-1.5 px-5 text-sm text-white transition-all hover:bg-white hover:text-black"
                >
                  Dashboard
                </motion.a>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {children}
      <div className="z-10 flex h-20 items-center justify-center space-x-12 border-t border-gray-200">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="h-6 w-6 text-gray-600" />
        </a>
        <Link href={hostname === "https://dub.sh" ? "/" : `https://dub.sh/`}>
          <span className="sr-only">Dub.sh Logo</span>
          <Logo className="h-7 w-7 text-gray-600" />
        </Link>
        <a
          href="https://github.com/steven-tey/dub"
          target="_blank"
          rel="noreferrer"
        >
          <span className="sr-only">Github</span>
          <Github className="h-6 w-6 text-gray-600" />
        </a>
      </div>
    </div>
  );
}
