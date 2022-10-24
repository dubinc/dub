import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import MenuIcon from "@/components/layout/app/menu-icon";
import { ChevronDown, Tick } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";

const statuses = [
  {
    display: "Active",
    slug: "active",
    color: "bg-green-500",
  },
  {
    display: "Expired",
    slug: "expired",
    color: "bg-amber-500",
  },
  {
    display: "Archived",
    slug: "archived",
    color: "bg-gray-400",
  },
];

const statusArrToStr = (newStatusArr: string[]) => {
  if (
    ["active", "expired", "archived"].every((s) => newStatusArr.includes(s))
  ) {
    return "all";
  } else if (newStatusArr.length === 0) {
    return "none";
  } else if (newStatusArr.includes("active") && newStatusArr.length === 1) {
    return "default";
  } else {
    return newStatusArr.join(",");
  }
};

export default function StatusFilter() {
  const [openPopover, setOpenPopover] = useState(false);
  const router = useRouter();
  const { status } = router.query as { status?: string };
  const selectedStatus = useMemo(() => {
    if (!status) {
      return ["active"];
    } else if (status === "all" || status === "none") {
      return ["active", "expired", "archived"];
    } else {
      return status.split(",");
    }
  }, [status]);

  return (
    <Popover
      content={
        <div className="w-full md:w-44 p-2">
          {statuses.map(({ display, slug, color }) => (
            <button
              key={slug}
              onClick={() => {
                let newStatusArr;
                if (selectedStatus.includes(slug)) {
                  if (status === "none") {
                    newStatusArr = [slug];
                  } else {
                    newStatusArr = selectedStatus.filter((s) => s !== slug);
                  }
                } else {
                  newStatusArr = [...selectedStatus, slug];
                }
                let newQuery;
                if (statusArrToStr(newStatusArr) === "default") {
                  delete router.query.status;
                  newQuery = { ...router.query };
                } else {
                  newQuery = {
                    ...router.query,
                    status: statusArrToStr(newStatusArr),
                  };
                }
                const { slug: omit, ...finalQuery } = newQuery;
                router.push({
                  pathname: `/${router.query.slug || "links"}`,
                  query: finalQuery,
                });
              }}
              className="flex items-center justify-between p-2 w-full rounded-md hover:bg-gray-100 active:bg-gray-200"
            >
              <MenuIcon
                text={display}
                icon={<div className={`rounded-full w-2 h-2 ${color}`} />}
              />
              {(status === "all" ||
                (selectedStatus.includes(slug) && status !== "none")) && (
                <Tick className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex justify-between items-center space-x-2 bg-white w-full sm:w-44 px-3 py-2.5 rounded-md shadow hover:shadow-md active:scale-95 transition-all duration-75"
      >
        <div className="flex items-center space-x-2 text-gray-700">
          <div className="flex -space-x-1">
            {statuses.map(({ slug, color }) => (
              <div
                key={slug}
                className={`rounded-full w-3.5 h-3.5 ${
                  selectedStatus.includes(slug) ? color : "bg-gray-200"
                } border border-white`}
              />
            ))}
          </div>
          <p className="text-sm">Status</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 ${
            openPopover ? "transform rotate-180" : ""
          } transition-all duration-75`}
        />
      </button>
    </Popover>
  );
}
