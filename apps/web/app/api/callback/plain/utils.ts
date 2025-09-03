import { nFormatter } from "@dub/utils";
import { uiComponent } from "@team-plain/typescript-sdk";

export const plainDivider = uiComponent.divider({
  spacingSize: "M",
});
export const plainSpacer = uiComponent.spacer({
  size: "S",
});

export const plainEmptyContainer = (text: string) =>
  uiComponent.container({
    content: [
      plainSpacer,
      uiComponent.plainText({
        text,
        size: "S",
      }),
      plainSpacer,
    ],
  });

export const plainTextSection = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) =>
  uiComponent.row({
    mainContent: [
      uiComponent.text({
        text: label,
        size: "M",
        color: "MUTED",
      }),
    ],
    asideContent: [
      uiComponent.text({
        text: value,
        size: "M",
        color: "NORMAL",
      }),
    ],
  });

export const plainCopySection = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => [
  uiComponent.text({
    text: label,
    size: "S",
    color: "MUTED",
  }),
  uiComponent.row({
    mainContent: [
      uiComponent.text({
        text: value,
      }),
    ],
    asideContent: [
      uiComponent.copyButton({
        tooltip: `Copy ${label}`,
        value: value,
      }),
    ],
  }),
];

export const plainUsageSection = ({
  usage,
  usageLimit,
  label,
  sublabel,
  color,
}: {
  usage: number | string;
  usageLimit?: number;
  label: string;
  sublabel?: string;
  color: "GREY" | "GREEN" | "YELLOW" | "RED" | "BLUE";
}) =>
  uiComponent.row({
    mainContent: [
      uiComponent.text({
        text: label,
        size: "M",
        color: "NORMAL",
      }),
      ...(sublabel
        ? [
            uiComponent.text({
              text: sublabel,
              size: "S",
              color: "MUTED",
            }),
          ]
        : []),
    ],
    asideContent: [
      uiComponent.badge({
        label:
          typeof usage === "number"
            ? `${nFormatter(usage, { full: true })}${usageLimit ? ` of ${nFormatter(usageLimit, { full: true })}` : ""}`
            : usage,
        color: color,
      }),
    ],
  });
