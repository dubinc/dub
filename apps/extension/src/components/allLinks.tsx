import React, { useEffect, useMemo, useState } from "react";
import LinkTemplate from "../../public/icons/linkTemplate";
import LinkCard from "./link";
import useLinks from "../../lib/swr/use-links";
import { ShortLinkProps } from "src/types";
import { getLocalLinks }from "../../utils/src/function/localLinks";

const AllLinks: React.FC = () => {
  const { links } = useLinks();
  const [localLinks, setLocalLinks] = useState<ShortLinkProps[]>([]);

  useEffect(() => {
    async function fetchLocalLinks() {
      setLocalLinks(await getLocalLinks());
    }
    fetchLocalLinks();
}, []);

  const allLinks = useMemo(() => {
  return [...(links || []), ...localLinks];
}, [links, localLinks]);


  return (
    <div className="h-40 overflow-y-auto pr-2"
    style={{ scrollbarWidth: 'none', whiteSpace: 'nowrap'}}
    >
      {allLinks?.length ? (
        allLinks?.map((link) => (
          <LinkCard link={link} />
        ))
      ) : (
        <>
        <LinkTemplate />
        <LinkTemplate />
        </>
      )}
    </div>
  );
};
export default AllLinks;
