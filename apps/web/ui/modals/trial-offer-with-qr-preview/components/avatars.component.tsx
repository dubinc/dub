import * as Avatar from "@radix-ui/react-avatar";
import { default as man } from "ui/modals/trial-offer-with-qr-preview/assets/avatars/man.png";
import { default as woman } from "ui/modals/trial-offer-with-qr-preview/assets/avatars/woman.png";

export const usersWithAvatar = [
  {
    name: "S",
  },
  {
    name: "John",
    avatar: man,
  },
  {
    name: "Anna",
    avatar: woman,
  },
];

export const AvatarsComponent = () => {
  const max = 3;
  const visibleUsers = usersWithAvatar.slice(0, max);

  return (
    <div className="flex justify-end -space-x-3">
      {visibleUsers.map((item, index) => (
        <Avatar.Root
          key={index}
          // className="h-8 w-8 overflow-hidden rounded-full border border-gray-400 bg-gray-100"
          className="ring-offset-background dark:ring-offset-background-dark ring-default text-slate relative z-0 ms-0 box-border flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-gray-200 bg-gray-200 align-middle text-xl outline-none ring-2 ring-gray-300 ring-offset-2 transition-transform"
        >
          <Avatar.Image
            src={item?.avatar?.src ?? ""}
            alt={item.name}
            className="h-full w-full object-cover"
          />
          <Avatar.Fallback
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-normal text-inherit"
            delayMs={600}
          >
            {item.name.charAt(0)}
          </Avatar.Fallback>
        </Avatar.Root>
      ))}
      <Avatar.Root className="ring-offset-background dark:ring-offset-background-dark ring-default text-slate relative z-0 ms-0 box-border flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-gray-700 bg-gray-200 align-middle text-xl outline-none ring-2 ring-gray-300 ring-offset-2 transition-transform">
        <Avatar.Fallback
          className="text-slate flex h-full w-full items-center justify-center text-xs font-medium"
          delayMs={600}
        >
          +32k
        </Avatar.Fallback>
      </Avatar.Root>
    </div>
  );
};
