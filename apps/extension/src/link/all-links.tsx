import { useEffect, useMemo, useState } from "react";
import { ShortLinkProps } from "src/types";
import useLinks from "../../lib/swr/use-links";
import LinkTemplate from "../../public/icons/linkTemplate";
import { getLocalLinks } from "../../utils/functions/localLinks";
import LinkCard from "./link-card";

function AllLinks() {
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
    <div
    className=""
    >
      {allLinks?.length ? (
        allLinks?.map((link) => <LinkCard props={link} />)
      ) : (
        <>
          <LinkTemplate />
          <LinkTemplate />
        </>
      )}
    </div>
  );
}
export default AllLinks;
