import { ProgramProps } from "@/lib/types";
import { Button, Check, Copy, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";

const BUTTON_CLASSNAME = "h-9 rounded-lg bg-neutral-900 hover:bg-neutral-800";

export function EmbedQuickstart({
  program,
  link,
}: {
  program: ProgramProps;
  link: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const items = [
    {
      title: "Share your link",
      description: `Sharing is caring! Recommend ${program.name} to all your friends, family, and social followers.`,
      cta: (
        <Button
          className={BUTTON_CLASSNAME}
          onClick={() => copyToClipboard(link)}
          text={copied ? "Copied link" : "Copy link"}
          icon={
            <div className="relative size-4">
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  copied && "translate-y-1 opacity-0",
                )}
              >
                <Copy className="size-4" />
              </div>
              <div
                className={cn(
                  "absolute inset-0 transition-[transform,opacity]",
                  !copied && "translate-y-1 opacity-0",
                )}
              >
                <Check className="size-4" />
              </div>
            </div>
          }
        />
      ),
    },
    {
      title: "Success kit",
      description:
        "Make sure you get setup for success with the official brand files and supportive content and documents.",
      cta: <Button className={BUTTON_CLASSNAME} text="Download success kit" />,
    },
    {
      title: "Receive earnings",
      description:
        "After you payouts are connected, you'll get paid out automatically for all your sales.",
      cta: <Button className={BUTTON_CLASSNAME} text="Connect payouts" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-100 bg-white p-2">
      {items.map((item) => (
        <div className="flex flex-col items-center justify-between gap-2 gap-4 rounded-lg bg-neutral-50 p-8 text-center">
          <h3 className="text-lg font-medium">{item.title}</h3>
          <p className="text-pretty text-sm text-neutral-500">
            {item.description}
          </p>
          {item.cta}
        </div>
      ))}
    </div>
  );
}
