import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { X } from "@/ui/shared/icons";
import {
  ArrowUpRight,
  BookOpen,
  Button,
  EnvelopeArrowRight,
  Page2,
  Sheet,
} from "@dub/ui";

interface ProgramSupportSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface SupportArticle {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

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
            <ProgramSupportLinks />
            <ProgramSupportArticles />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function ProgramSupportArticles() {
  const articles: SupportArticle[] = [];

  if (articles.length === 0) {
    return null;
  }

  return (
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
  );
}

function ProgramSupportLinks() {
  const { programEnrollment } = useProgramEnrollment();

  if (!programEnrollment) {
    return null;
  }

  const { program } = programEnrollment;

  const supportItems = [
    ...(program.supportEmail
      ? [
          {
            icon: EnvelopeArrowRight,
            label: "Email support",
            href: `mailto:${program.supportEmail}`,
          },
        ]
      : []),
    ...(program.helpUrl
      ? [
          {
            icon: BookOpen,
            label: "Help center",
            href: program.helpUrl,
          },
        ]
      : []),
    ...(program.termsUrl
      ? [
          {
            icon: Page2,
            label: "Terms of service",
            href: program.termsUrl,
          },
        ]
      : []),
  ];

  if (supportItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-neutral-100 p-4">
      <div className="mb-4 flex items-center gap-2">
        {program.logo && (
          <img
            src={program.logo}
            alt={program.name}
            width={24}
            height={24}
            className="size-6 rounded-full"
          />
        )}
        <h2 className="text-sm font-semibold text-neutral-900">
          {program.name} Support
        </h2>
      </div>

      <div className="space-y-2">
        {supportItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:bg-neutral-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                <item.icon className="size-5 text-neutral-800" />
              </div>
              <span className="text-sm font-medium text-neutral-800">
                {item.label}
              </span>
            </div>
            <ArrowUpRight className="size-4 text-neutral-500" />
          </a>
        ))}
      </div>
    </div>
  );
}
