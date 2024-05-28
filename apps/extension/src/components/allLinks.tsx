import React from "react";
import LinkTemplate from "../../public/icons/linkTemplate";
import LinkItem from "./link";
import { LinkProp, LinkProps, ShortLinkProps } from "../types";

const AllLinks: React.FC<{ links: ShortLinkProps[] }> = ({ links }) => {
  return (
    <>
      {links?.length ? (
        links?.map((link) => {
          <LinkItem link={link} />;
        })
      ) : (
        <LinkTemplate />
      )}
    </>
  );
};
export default AllLinks;
