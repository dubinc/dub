import { expect, test } from "@playwright/experimental-ct-react";
import { Button } from "../../src";

test("Button accepts text prop", async ({ mount }) => {
  const buttonComponent = await mount(<Button text="Hello World" />);

  await expect(buttonComponent).toHaveText("Hello World");
});
