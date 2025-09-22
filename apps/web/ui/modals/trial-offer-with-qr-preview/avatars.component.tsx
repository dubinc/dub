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

import * as Avatar from "@radix-ui/react-avatar";

export const AvatarsComponent = () => {
  const max = 3;
  const visibleUsers = usersWithAvatar.slice(0, max);

  return (
    <div className="flex -space-x-3">
      {visibleUsers.map((item, index) => (
        <Avatar.Root
          key={index}
          className="h-8 w-8 overflow-hidden rounded-full border border-gray-400 bg-gray-100"
        >
          <Avatar.Image
            src={item?.avatar?.src ?? ""}
            alt={item.name}
            className="h-full w-full object-cover"
          />
          <Avatar.Fallback
            className="text-slate flex h-full w-full items-center justify-center bg-neutral-200/20 text-xs font-medium"
            delayMs={600}
          >
            {item.name.charAt(0)}
          </Avatar.Fallback>
        </Avatar.Root>
      ))}
      <Avatar.Root className="h-8 w-8 overflow-hidden rounded-full border border-gray-400 bg-gray-100">
        <Avatar.Fallback
          className="text-slate flex h-full w-full items-center justify-center bg-neutral-200/20 text-xs font-medium"
          delayMs={600}
        >
          +32k
        </Avatar.Fallback>
      </Avatar.Root>
    </div>
  );
};
