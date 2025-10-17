"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { BookOpen, EnvelopeArrowRight, Page2 } from "@dub/ui";
import { memo } from "react";

export const ProgramHelpLinks = memo(() => {
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
    <div className="grid grid-cols-1">
      {supportItems.map(({ icon: Icon, label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-content-default hover:text-content-emphasis hover:bg-bg-inverted/5 active:bg-bg-inverted/10 flex items-center gap-2 rounded-md py-1.5 text-sm transition-all hover:px-2.5"
        >
          <Icon className="size-4" />
          {label}
        </a>
      ))}
    </div>
  );
});
