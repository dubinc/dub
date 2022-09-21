import HomeLayout from "@/components/layout/home";
import { useState } from "react";
import Link from "next/link";
import useLocalStorage from "@/lib/hooks/use-local-storage";
import LinkCard from "@/components/home/link-card";
import PlaceholderCard from "@/components/home/placeholder-card";
import {
  Github,
  LoadingDots,
  Twitter,
  CheckCircleFill,
} from "@/components/shared/icons";
import { motion, AnimatePresence } from "framer-motion";
import { SimpleLinkProps } from "@/lib/types";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Globe from "@/components/home/globe";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <HomeLayout>
      <Hero />
      <Demo />
      {/* <Globe /> */}
      <Features />
    </HomeLayout>
  );
}

const Hero = () => {
  return (
    <div className="max-w-md sm:max-w-lg mt-20 mb-10 text-center mx-auto sm:px-0 px-2.5">
      <a
        href="https://dub.sh/twitter"
        target="_blank"
        rel="noreferrer"
        className="bg-blue-100 hover:bg-blue-200 flex justify-center items-center space-x-2 max-w-fit px-7 py-2 mx-auto rounded-full overflow-hidden transition-all"
      >
        <Twitter className="w-5 h-5 text-[#1d9bf0]" />
        <p className="text-[#1d9bf0] font-semibold text-sm">
          Announcing Dub.sh
        </p>
      </a>

      <h1 className="text-5xl sm:text-6xl leading-tight sm:leading-tight font-display font-extrabold text-black mt-5">
        Open Source
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500">
          Bitly Alternative
        </span>
      </h1>
      <p className="text-gray-600 text-xl sm:text-2xl mt-5">
        An open-source link shortener with built-in analytics and free custom
        domains.
      </p>

      <div className="mt-10 flex space-x-4 max-w-fit mx-auto">
        <Link href="https://app.dub.sh">
          <a className="py-2 px-5 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all">
            Start For Free
          </a>
        </Link>
        <a
          className="flex justify-center items-center space-x-2 py-2 px-5 bg-white rounded-full border border-gray-300 hover:border-gray-800 transition-all"
          href="https://dub.sh/github"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="w-5 h-5 text-black" />
          <p className="text-sm">Star on GitHub</p>
        </a>
      </div>
    </div>
  );
};

const Demo = () => {
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [hashes, setHashes] = useLocalStorage<SimpleLinkProps[]>("hashes", []);

  return (
    <div className="max-w-md mx-auto sm:px-0 px-2.5">
      <Toaster />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          fetch(`/api/edge/links?url=${url}&hostname=dub.sh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }).then(async (response) => {
            setSaving(false);
            if (response.ok) {
              const json = await response.json();
              setHashes([...hashes, json]);
              setUrl("");
            }
          });
        }}
      >
        {hashes.length >= 3 ? (
          <Tooltip
            content={
              <TooltipContent
                title="Maximum number of links reached. Swipe to delete existing links or
            create a free account."
                cta="Start For Free"
                ctaLink="https://app.dub.sh"
              />
            }
          >
            <div className="relative flex items-center">
              <div className="shadow-sm bg-white border focus:border-black block w-full p-2 text-sm text-gray-400 border-gray-200 rounded-md pl-3 pr-12">
                Shorten your link
              </div>
              <div className="cursor-not-allowed absolute inset-y-0 right-0 w-10 flex justify-center items-center my-1.5 mr-1.5 border border-gray-200 rounded text-sm font-sans font-medium text-gray-400">
                <p>↵</p>
              </div>
            </div>
          </Tooltip>
        ) : (
          <div className="relative flex items-center">
            <input
              type="url"
              placeholder="Shorten your link"
              value={url}
              onInput={(e) => {
                setUrl((e.target as HTMLInputElement).value);
              }}
              required
              className="peer shadow-sm focus:outline-none focus:ring-0 bg-white border focus:border-black block w-full p-2 text-sm border-gray-200 rounded-md pl-3 pr-12"
            />
            <button
              type="submit"
              disabled={saving}
              className={`${
                saving
                  ? "cursor-not-allowed"
                  : "hover:border-gray-700 peer-focus:border-gray-700 hover:text-gray-700 peer-focus:text-gray-700"
              } absolute inset-y-0 right-0 w-10 flex justify-center items-center my-1.5 mr-1.5 border border-gray-200 rounded text-sm font-sans font-medium text-gray-400`}
            >
              {saving ? <LoadingDots color="#e5e7eb" /> : <p>↵</p>}
            </button>
          </div>
        )}
      </form>

      <motion.ul
        key={hashes.length + 1} // workaround for https://github.com/framer/motion/issues/776, add 1 to account for the demo GH link
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="grid gap-2 mt-3"
      >
        <LinkCard
          key="github"
          _key="github"
          url={"https://github.com/steven-tey/dub"}
        />
        {hashes.map(({ key, url }) => (
          <LinkCard
            key={key}
            _key={key}
            url={url}
            hashes={hashes}
            setHashes={setHashes}
          />
        ))}
        {Array.from({ length: 3 - hashes.length }).map((_, i) => (
          <PlaceholderCard key={i} />
        ))}
      </motion.ul>
    </div>
  );
};

const Features = () => {
  return (
    <div className="max-w-md mx-auto sm:px-0 px-2.5">
      <h2 className="text-3xl font-display font-semibold text-black mt-10">
        Features
      </h2>
      <ul className="mt-5 space-y-5">
        <li className="flex space-x-5">
          <div className="flex-shrink-0">
            <CheckCircleFill className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-gray-600 text-lg">Free custom domains</p>
        </li>
        <li className="flex space-x-5">
          <div className="flex-shrink-0">
            <CheckCircleFill className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-gray-600 text-lg">Built-in analytics</p>
        </li>
        <li className="flex space-x-5">
          <div className="flex-shrink-0">
            <CheckCircleFill className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-gray-600 text-lg">Open-source</p>
        </li>
      </ul>
    </div>
  );
};

const Pricing = () => {
  return (
    <div className="max-w-md mx-auto sm:px-0 px-2.5">
      <h2 className="text-3xl font-display font-semibold text-black mt-10">
        Start for free.
      </h2>
      <p className="text-gray-600 text-lg mt-5">
        Dub is completely free to use. You can use it for personal or commercial
        use.
      </p>
    </div>
  );
};
