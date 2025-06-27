"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { BookOpen, EnvelopeArrowRight, Page2 } from "@dub/ui";
import { memo } from "react";

export const ProgramHelpSupport = memo(() => {
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
    <div className="border-border-default grid gap-1 rounded-lg border p-2">
      <p className="text-content-emphasis text-balance px-2.5 py-2 text-sm font-semibold">
        {program.name.length <= 12 ? `${program.name} ` : ""}
        Program Support
      </p>
      <div className="grid grid-cols-1">
        {supportItems.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-default hover:text-content-emphasis hover:bg-bg-inverted/5 active:bg-bg-inverted/10 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors"
          >
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
});
