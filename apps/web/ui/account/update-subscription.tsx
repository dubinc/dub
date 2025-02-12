import { Switch, useOptimisticUpdate } from "@dub/ui";
import { APP_NAME } from "@dub/utils";

export default function UpdateSubscription() {
  const { data, isLoading, update } = useOptimisticUpdate<{
    subscribed: boolean;
  }>("/api/user/subscribe", {
    loading: "Updating email preferences...",
    success: `Your ${APP_NAME} email preferences has been updated!`,
    error: "Failed to update email preferences. Please try again.",
  });

  const subscribe = async (checked: boolean) => {
    const method = checked ? "POST" : "DELETE";
    const res = await fetch("/api/user/subscribe", {
      method,
    });
    if (!res.ok) {
      throw new Error("Failed to update email preferences");
    }
    return { subscribed: checked };
  };

  return (
    <div className="flex items-center gap-x-2">
      <Switch
        checked={data?.subscribed}
        loading={isLoading}
        fn={(checked: boolean) => {
          update(() => subscribe(checked), { subscribed: checked });
        }}
      />
      <p className="text-sm text-neutral-500">Subscribed to product updates</p>
    </div>
  );
}
