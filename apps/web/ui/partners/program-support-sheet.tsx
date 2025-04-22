import { X } from "@/ui/shared/icons";
import { Button, Link4, Sheet } from "@dub/ui";
import { Building2, TrendingUp } from "lucide-react";

interface ProgramSupportSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface SupportArticle {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const articles: SupportArticle[] = [
  {
    icon: Building2,
    title: "Connecting your bank account",
    description: "Here's the article sub-text and can show across two lines",
  },
  {
    icon: Link4,
    title: "Creating additional short links",
    description: "Here's the article sub-text and can show across two lines",
  },
  {
    icon: TrendingUp,
    title: "Collecting your payouts",
    description: "Here's the article sub-text and can show across two lines",
  },
];

export function ProgramSupportSheet({
  isOpen,
  setIsOpen,
}: ProgramSupportSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="flex items-start justify-between p-6">
            <Sheet.Title className="text-xl font-semibold">
              Help and support
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>

        <div className="flex grow flex-col">
          <div className="grow overflow-y-auto p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Partner setup
                </h2>
                <div className="mt-4 space-y-3">
                  {articles.map((article) => (
                    <button
                      key={article.title}
                      className="flex w-full items-start gap-3 rounded-lg border border-neutral-200 bg-white p-2 text-left transition-all hover:border-neutral-300"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                        <article.icon className="size-4 text-neutral-800" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-neutral-800">
                          {article.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-600">
                          {article.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
