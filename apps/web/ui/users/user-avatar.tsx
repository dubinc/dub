import { cn, hashStringSHA256 } from "@dub/utils";

type User = {
  id?: string | null | undefined;
  name?: string | null | undefined;
  email?: string | null | undefined;
  image?: string | null | undefined;
};

export function getUserAvatarUrl(user?: User | null) {
  if (user?.image) return user.image;

  if (!user?.id) return "https://api.dub.co/og/avatar";

  const ogAvatar = `https://api.dub.co/og/avatar/${user.id}`;

  return user.email
    ? `https://0.gravatar.com/avatar/${hashStringSHA256(user.email)}?d=${ogAvatar}`
    : ogAvatar;
}

export function UserAvatar({
  user = {},
  className,
}: {
  user?: User;
  className?: string;
}) {
  if (!user) {
    return (
      <div
        className={cn(
          "h-10 w-10 animate-pulse rounded-full border border-neutral-300 bg-neutral-100",
          className,
        )}
      />
    );
  }

  return (
    <img
      alt={`Avatar for ${user.name || user.email}`}
      referrerPolicy="no-referrer"
      src={getUserAvatarUrl(user)}
      className={cn(
        "h-10 w-10 rounded-full border border-neutral-300",
        className,
      )}
      draggable={false}
    />
  );
}
