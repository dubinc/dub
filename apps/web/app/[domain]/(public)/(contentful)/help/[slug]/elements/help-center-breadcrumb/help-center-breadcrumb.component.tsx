import { Icon } from "@iconify/react";

import Link from "next/link";
import { FC } from "react";

interface IHelpCenterBreadcrumbComponentProps {
  breadCrumbLabel?: string;
}

const breadcrumbItems = [
  { label: "Home", href: "/landing" },
  { label: "Help Center", href: "/help" },
];

export const HelpCenterBreadcrumbComponent: FC<
  Readonly<IHelpCenterBreadcrumbComponentProps>
> = ({ breadCrumbLabel }) => (
  <nav className="text-grey-light flex w-full text-sm">
    <ul className={"flex items-center"}>
      {breadcrumbItems.map((item, index) => (
        <li key={index} className="flex items-center">
          <Link href={item.href}>
            <p className={"cursor-pointer whitespace-nowrap hover:underline"}>
              {item.label}
            </p>
          </Link>
          <span className="mx-2">
            <Icon icon="tabler:chevron-right" width={16} />
          </span>
        </li>
      ))}
      <li>
        <p className={"text-dark-custom font-bold"}>{breadCrumbLabel}</p>
      </li>
    </ul>
  </nav>
);
