import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import useSWR from "swr";
import BlurImage from "@/components/shared/blur-image";
import { ChevronDown, Search, X } from "@/components/shared/icons";
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
        <div className="w-full p-2 md:w-56">
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
              className="flex w-full items-center space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
            >
              <BlurImage
                src={`https://avatar.vercel.sh/${email}`}
                alt={email}
                width={28}
                height={28}
                className="rounded-full"
              />
              <p className="truncate text-sm text-gray-700">{name || email}</p>
            </button>
          ))}
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex w-full items-center justify-between space-x-1 rounded-md bg-white px-3 py-2 shadow transition-all duration-75 hover:shadow-md active:scale-95 md:w-56"
      >
        <div className="flex w-44 items-center space-x-2 text-gray-700">
          <Search className="h-4 w-4 shrink-0" />
          <p className="truncate text-sm">
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
            className="rounded-full p-1 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </div>
        ) : (
          <ChevronDown
            className={`h-5 w-5 cursor-pointer text-gray-400 ${
              openPopover ? "rotate-180 transform" : ""
            } transition-all duration-75`}
          />
        )}
      </button>
    </Popover>
  );
}
