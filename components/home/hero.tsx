import Link from "next/link";
import { Github, Twitter } from "@/components/shared/icons";

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
          Introducing Dub.sh
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
        Dub is an open-source link shortener with built-in analytics and free
        custom domains.
      </p>

      <div className="mt-10 flex space-x-4 max-w-fit mx-auto">
        <Link href="https://app.dub.sh/register">
          <a className="py-2 px-5 bg-black hover:bg-white rounded-full border border-black text-sm text-white hover:text-black transition-all">
            Start For Free
          </a>
        </Link>
        <a
          className="flex justify-center items-center space-x-2 py-2 px-5 bg-white rounded-full border border-gray-300 hover:border-gray-800 transition-all"
          href="https://github.com/steven-tey/dub"
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

export default Hero;
