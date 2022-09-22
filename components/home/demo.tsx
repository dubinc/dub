import { useState } from "react";
import useLocalStorage from "@/lib/hooks/use-local-storage";
import LinkCard from "@/components/home/link-card";
import PlaceholderCard from "@/components/home/placeholder-card";
import { LoadingDots } from "@/components/shared/icons";
import { motion } from "framer-motion";
import { SimpleLinkProps } from "@/lib/types";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import { Toaster } from "react-hot-toast";

const Demo = () => {
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState("");
  const [hashes, setHashes] = useLocalStorage<SimpleLinkProps[]>("hashes", []);

  return (
    <div className="max-w-md w-full mx-auto sm:px-0 px-2.5">
      <Toaster />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          fetch(`/api/edge/links?url=${encodeURIComponent(url)}&hostname=dub.sh`, {
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
                ctaLink="https://app.dub.sh/register"
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

export default Demo;
