import { UserSchema } from "@/lib/zod/schemas/users";
import { Tooltip } from "@dub/ui";
import { formatDate, formatDateTime, OG_AVATAR_URL } from "@dub/utils";
import { z } from "zod";

type UserProps = z.infer<typeof UserSchema>;

export function UserRowItem({
  user,
  date,
  label,
}: {
  user: Pick<UserProps, "id" | "name" | "image">;
  date: Date;
  label: string;
}) {
  const image = user.image || `${OG_AVATAR_URL}${user.name}`;
  const name = user.name ?? user.id;

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-1 p-2.5">
          {user && (
            <div className="flex flex-col gap-2">
              <img
                src={image}
                alt={name}
                className="size-6 shrink-0 rounded-full"
              />
              <p className="text-sm font-medium">{user.name}</p>
            </div>
          )}

          <div className="text-xs text-neutral-500">
            {label}{" "}
            <span className="font-medium text-neutral-700">
              {formatDateTime(date, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              })}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-2">
        {user && (
          <img
            src={image}
            alt={name}
            className="size-5 shrink-0 rounded-full"
          />
        )}

        {formatDate(date, {
          month: "short",
          year: undefined,
        })}
      </div>
    </Tooltip>
  );
}
