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
  <ul className="flex flex-col gap-2">
    <p className="text-neutral-default mb-2 text-lg font-semibold">{title}</p>
    {links.map((link, index) => (
      <li key={index}>
        <Link
          className="text-neutral-default text-base font-medium"
          href={link.href}
          target="_blank"
        >
          {link.text}
        </Link>
      </li>
    ))}
  </ul>
);
