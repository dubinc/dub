import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import useSWR from "swr";
import BlurImage from "@/components/shared/blur-image";
import { ChevronDown, Search, Tick, X } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import { UserProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export default function UserFilter() {
  const [openPopover, setOpenPopover] = useState(false);
  const router = useRouter();
  const { slug } = router.query as { slug?: string };
  const { data: users } = useSWR<UserProps[]>(
    slug && `/api/projects/${slug}/users`,
    fetcher,
    {
      dedupingInterval: 30000,
      fallbackData: [],
    },
  );
  const { userId } = router.query as { userId?: string };

  const currentUser = useMemo(
    () => users.find((user) => user.id === userId) || null,
    [users, userId],
  );

  return (
    <Popover
      content={
        <div className="w-full md:w-56 p-2">
          {users.map(({ id, name, email }) => (
            <button
              key={id}
              onClick={() => {
                let newQuery;
                newQuery = {
                  ...router.query,
                  userId: id,
                };
                const { slug: omit, ...finalQuery } = newQuery;
                router.push({
                  pathname: `/${router.query.slug}`,
                  query: finalQuery,
                });
              }}
              className="flex items-center space-x-2 p-2 w-full rounded-md hover:bg-gray-100 active:bg-gray-200"
            >
              <BlurImage
                src={`https://avatar.tobi.sh/${email}`}
                alt={email}
                width={28}
                height={28}
                className="rounded-full"
              />
              <p className="text-sm text-gray-700 truncate">{name || email}</p>
            </button>
          ))}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex justify-between items-center space-x-2 bg-white w-56 px-3 py-2.5 rounded-md shadow hover:shadow-md active:scale-95 transition-all duration-75"
      >
        <div className="flex items-center space-x-2 text-gray-700 w-44">
          <Search className="h-4 w-4 shrink-0" />
          <p className="text-sm truncate">
            {currentUser?.name || currentUser?.email || "All Users..."}
          </p>
        </div>
        {currentUser ? (
          <div
            onClick={() => {
              let newQuery;
              newQuery = {
                ...router.query,
              };
              delete newQuery.userId;
              const { slug: omit, ...finalQuery } = newQuery;
              router.push({
                pathname: `/${router.query.slug}`,
                query: finalQuery,
              });
            }}
          >
            <X className="h-4 w-4" />
          </div>
        ) : (
          <ChevronDown
            className={`cursor-pointer w-5 h-5 text-gray-400 ${
              openPopover ? "transform rotate-180" : ""
            } transition-all duration-75`}
          />
        )}
      </button>
    </Popover>
  );
}
