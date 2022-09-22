import { Github, Logo, Twitter } from "@/components/shared/icons";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="border-t border-gray-200 h-20 flex items-center justify-center space-x-12">
      <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
        <span className="sr-only">Twitter</span>
        <Twitter className="w-6 h-6 text-gray-600" />
      </a>
      <Link href="/">
        <a>
          <span className="sr-only">Dub.sh Logo</span>
          <Logo className="w-7 h-7 text-gray-600" />
        </a>
      </Link>
      <a
        href="https://github.com/steven-tey/dub"
        target="_blank"
        rel="noreferrer"
      >
        <span className="sr-only">Github</span>
        <Github className="w-6 h-6 text-gray-600" />
      </a>
    </div>
  );
};

export default Footer;
