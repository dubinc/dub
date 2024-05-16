import React from "react";
import LinkItem from "./link";
import LinkTemplate from "../../public/icons/linkTemplate";
import { LinkProps } from "./types";

const AllLinks: React.FC<{links : LinkProps[] }> = ({links}) => {
  return (
    <>
      {links?.length ? (links?.map((link)=>{
       <LinkItem link={link} />
      })) : <LinkTemplate />}
    </>
  );
};
export default AllLinks;
