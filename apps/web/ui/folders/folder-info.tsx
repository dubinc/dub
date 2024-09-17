"use client";

import { FolderProps } from "@/lib/types";
import { Avatar, TokenAvatar } from "@dub/ui";
import {
  Apple,
  Cards,
  CircleHalfDottedClock,
  EarthPosition,
  EyeSlash,
  InputPassword,
  Robot,
} from "@dub/ui/src/icons";
import { useRef } from "react";
import { Link } from "../shared/icons";

const quickViewSettings = [
  { label: "Custom Social Media Cards", icon: Cards, key: "proxy" },
  { label: "Link Cloaking", icon: EyeSlash, key: "rewrite" },
  { label: "Password Protection", icon: InputPassword, key: "password" },
  { label: "Link Expiration", icon: CircleHalfDottedClock, key: "expiresAt" },
  { label: "iOS Targeting", icon: Apple, key: "ios" },
  { label: "Android Targeting", icon: Robot, key: "android" },
  { label: "Geo Targeting", icon: EarthPosition, key: "geo" },
];

export function FolderInfo({
  folder,
  linksCount,
}: {
  folder: FolderProps;
  linksCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // const { displayProperties } = useContext(LinksDisplayContext);
  // const isVisible = useInViewport(ref, { defaultValue: true });

  return (
    <div
      ref={ref}
      className="flex h-[32px] items-center gap-3 transition-[height] group-data-[variant=loose]/card-list:h-[60px]"
    >
      <div className="relative hidden shrink-0 items-center justify-center sm:flex">
        <div className="absolute inset-0 shrink-0 rounded-full border border-gray-200 opacity-0 transition-opacity group-data-[variant=loose]/card-list:sm:opacity-100">
          <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-gray-100" />
        </div>
        <div className="relative pr-0.5 transition-[padding] group-data-[variant=loose]/card-list:sm:p-2">
          <TokenAvatar id={folder.id} className="size-6" />
        </div>
      </div>
      <div className="h-[24px] min-w-0 transition-[height] group-data-[variant=loose]/card-list:h-[44px]">
        <div className="min-w-0 shrink grow-0">
          <div className="flex flex-col">
            <span className="font-semibold leading-6 text-gray-800">
              {folder.name}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Link className="h-4 w-4" />
                {linksCount} link{linksCount > 1 ? "s" : ""}
              </span>
              <Avatar user={null} className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// const UserAvatar = ({
//   link,
//   compact,
// }: {
//   link: ResponseLink;
//   compact?: boolean;
// }) => {
//   const { user } = link;
//   const { slug } = useWorkspace();

//   return (
//     <Tooltip
//       content={
//         <div className="w-full p-3">
//           <Avatar user={user} className="h-8 w-8" />
//           <div className="mt-2 flex items-center gap-1.5">
//             <p className="text-sm font-semibold text-gray-700">
//               {user?.name || user?.email || "Anonymous User"}
//             </p>
//             {!slug && // this is only shown in admin mode (where there's no slug)
//               user?.email && (
//                 <CopyButton
//                   value={user.email}
//                   icon={Mail}
//                   className="[&>*]:h-3 [&>*]:w-3"
//                 />
//               )}
//           </div>
//           <div className="flex flex-col gap-1 text-xs text-gray-500">
//             {user?.name && user.email && <p>{user.email}</p>}
//           </div>
//         </div>
//       }
//     >
//       <div>
//         <Avatar user={user} className="h-4 w-4" />
//       </div>
//     </Tooltip>
//   );
// }
