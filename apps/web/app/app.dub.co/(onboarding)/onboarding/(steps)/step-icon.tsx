import { Icon } from "@dub/ui";

export function StepIcon({ icon: Icon }: { icon: Icon }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white p-2.5">
      <Icon className="size-[18px]" />
    </div>
  );
}
