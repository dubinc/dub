import { Button } from "@dub/ui";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],

  argTypes: {
    text: { control: "string" },
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "outline",
        "success",
        "danger",
        "danger-outline",
      ],
    },
    type: {
      control: "select",
      options: ["button", "submit"],
    },
  },
  args: {
    text: "Click Me",
    variant: "primary",
    type: "button",
    loading: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "primary",
  },
};
