import { Input } from "@dub/ui";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "WIP/Input (WIP)",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],

  argTypes: {
    type: { control: "string" },
    error: { control: "string" },
  },
  args: {
    type: "text",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Destination URL",
    placeholder: "https://dub.co/help/article/what-is-dub",
  },
};

export const WithError: Story = {
  args: {
    label: "Destination URL",
    placeholder: "https://dub.co/help/article/what-is-dub",
    value: "http:/dub.co",
    error: "Invalid URL",
  },
};
