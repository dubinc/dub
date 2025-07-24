import { Text } from "@radix-ui/themes";
import Link from "next/link";
import { FC } from "react";

type TLink = {
  href: string;
  text: string;
};

interface ILinksProps {
  title: string;
  links: TLink[];
}

export const Links: FC<ILinksProps> = ({ title, links }) => (
  <ul className="text-neutral flex flex-col gap-2">
    <Text size={{ initial: "3", md: "4" }} weight="bold" className="mb-2">
      {title}
    </Text>
    {links.map((link, index) => (
      <li key={index}>
        <Link
          className="text-sm font-normal md:text-base"
          href={link.href}
          target="_blank"
        >
          {link.text}
        </Link>
      </li>
    ))}
  </ul>
);
