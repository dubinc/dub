import Link from "next/link";
import { Github, Logo, Twitter } from "@/components/shared/icons";
import Nav from "#/ui/home/nav";
import { headers } from "next/headers";
import { getDomain } from "@/lib/utils";

export default function MarketingLayout(props) {
  const domain = getDomain(headers());
  return (
    <div className="flex min-h-screen flex-col justify-between">
      {/* Only show stats modal if not on the /stats page */}
      {props.children.props.childProp.segment !== "stats" && props.modal}
      <Nav domain={domain} />
      {props.children}
      <div className="z-10 flex h-20 items-center justify-center space-x-12 border-t border-gray-200">
        <a href="https://twitter.com/dubdotsh" target="_blank" rel="noreferrer">
          <span className="sr-only">Twitter</span>
          <Twitter className="h-6 w-6 text-gray-600" />
        </a>
        <Link href={domain === "dub.sh" ? "/" : `https://dub.sh`}>
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
