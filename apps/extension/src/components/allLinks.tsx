import React from "react";
import LinkTemplate from "../../public/icons/linkTemplate";
import { ShortLinkProps } from "../types";
import LinkItem from "./link";

const AllLinks: React.FC<{ links: ShortLinkProps[] }> = ({ links }) => {
  return (
    <>
      {links?.length ? (
        links?.map((link) => {
          <LinkItem link={link} />;
        })
      ) : (
        <><LinkTemplate /><LinkTemplate /></>
      )}
    </>
  );
};
export default AllLinks;
