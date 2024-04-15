import { nFormatter } from "@dub/utils";

export const plainDivider = {
  componentDivider: {
    dividerSpacingSize: "M",
  },
};

export const plainEmptyContainer = (text: string) => ({
  componentContainer: {
    containerContent: [
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
      {
        componentPlainText: {
          text: "No user found.",
          size: "S",
        },
      },
      {
        componentSpacer: {
          spacerSize: "M",
        },
      },
    ],
  },
});

export const plainSpacer = {
  componentSpacer: {
    spacerSize: "M",
  },
};

export const plainTextSection = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => ({
  componentRow: {
    rowMainContent: [
      {
        componentText: {
          textSize: "M",
          textColor: "MUTED",
          text: label,
        },
      },
    ],
    rowAsideContent: [
      {
        componentText: {
          textSize: "M",
          textColor: "NORMAL",
          text: value,
        },
      },
    ],
  },
});

export const plainCopySection = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => [
  {
    componentText: {
      text: label,
      textSize: "S",
      textColor: "MUTED",
    },
  },
  {
    componentRow: {
      rowMainContent: [
        {
          componentText: {
            text: value,
          },
        },
      ],
      rowAsideContent: [
        {
          componentCopyButton: {
            copyButtonTooltipLabel: `Copy ${label}`,
            copyButtonValue: value,
          },
        },
      ],
    },
  },
];

export const plainUsageSection = ({
  usage,
  usageLimit,
  label,
  sublabel,
  color,
}: {
  usage: number;
  usageLimit?: number;
  label: string;
  sublabel?: string;
  color: "GREY" | "GREEN" | "YELLOW" | "RED" | "BLUE";
}) => ({
  componentRow: {
    rowMainContent: [
      {
        componentText: {
          textSize: "M",
          textColor: "NORMAL",
          text: label,
        },
      },
      ...(sublabel
        ? [
            {
              componentText: {
                textSize: "S",
                textColor: "MUTED",
                text: sublabel,
              },
            },
          ]
        : []),
    ],
    rowAsideContent: [
      {
        componentBadge: {
          badgeLabel: `${nFormatter(usage, { full: true })}${usageLimit ? ` of ${nFormatter(usageLimit, { full: true })}` : ""}`,
          badgeColor: color,
        },
      },
    ],
  },
});
