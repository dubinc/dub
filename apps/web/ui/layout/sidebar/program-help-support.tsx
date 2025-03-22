"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { BookOpen, EnvelopeArrowRight, Page2 } from "@dub/ui";

export function ProgramHelpSupport() {
  const { programEnrollment } = useProgramEnrollment();

  if (!programEnrollment?.program) return null;

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

  if (supportItems.length === 0) return null;

  return (
    <div className="m-2 grid gap-1 rounded-md border border-neutral-300/80 p-1">
      <div className="grid gap-2 p-2.5">
        {program.logo && (
          <img
            src={program.logo}
            alt={program.name}
            width={32}
            height={32}
            className="size-4 rounded-md"
          />
        )}
        <p className="text-sm font-medium text-neutral-900">Help & Support</p>
      </div>
      <div className="grid p-1">
        {supportItems.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md p-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-300/75 hover:text-neutral-700"
          >
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
