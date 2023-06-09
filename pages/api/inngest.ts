import { inngest } from "#/lib/inngest";
import { serve } from "inngest/next";

const helloWorld = inngest.createFunction(
  { name: "Hello World" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("1s");
    return { event, body: "Hello, World!" };
  },
);

// Create an API that serves zero functions
export default serve(inngest, [helloWorld]);
