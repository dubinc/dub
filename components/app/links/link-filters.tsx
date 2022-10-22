import { useRouter } from "next/router";
import { useState } from "react";
import { ChevronDown, Tick } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import Switch from "@/components/shared/switch";

export default function LinkFilters() {
  const router = useRouter();
  return (
    <div className="my-5 flex justify-end">
      {/* <div className="bg-white p-3 rounded-lg shadow hover:shadow-md transition-all">
        <Switch
          fn={(checked) => {
            let newQuery;
            if (checked) {
              newQuery = { ...router.query, archived: "true" };
            } else {
              delete router.query.archived;
              newQuery = { ...router.query };
            }
            const { slug: omit, ...finalQuery } = newQuery;
            router.push({
              pathname: `/${router.query.slug}`,
              query: finalQuery,
            });
          }}
        />
      </div> */}
      <StatusFilter />
    </div>
  );
}

const statuses = [
  {
    display: "Active",
    slug: "active",
    color: "bg-green-400",
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

const StatusFilter = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { status } = router.query as { status?: string };
  const selectedStatus = !status
    ? ["active"]
    : status === "all" || status === "none"
    ? ["active", "expired", "archived"]
    : status.split(",");

  return (
    <Popover
      content={
        <div className="w-44 p-2">
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
              <div className="flex items-center justify-start space-x-2">
                <div className={`rounded-full w-2 h-2 ${color}`} />
                <p className="text-sm text-gray-700">{display}</p>
              </div>
              {(status === "all" ||
                (selectedStatus.includes(slug) && status !== "none")) && (
                <Tick className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      }
      openPopover={open}
      setOpenPopover={setOpen}
    >
      <button className="flex justify-between items-center space-x-2 bg-white w-44 px-3 py-2.5 rounded-md shadow hover:shadow-md active:scale-95 transition-all duration-75">
        <p className="text-sm text-gray-700">Filter by Status</p>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 ${
            open ? "transform rotate-180" : ""
          } transition-all duration-75`}
        />
      </button>
    </Popover>
  );
};
