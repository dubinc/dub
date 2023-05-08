import Link from "next/link";
import { Github, Logo, Twitter } from "@/components/shared/icons";
import Nav from "#/ui/home/nav";

export default function MarketingLayout(props) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Nav />
      {props.children}
      {props.modal}
      <div className="z-10 flex h-20 items-center justify-center space-x-12 border-t border-gray-200">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="h-6 w-6 text-gray-600" />
        </a>
        <Link href="/">
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
