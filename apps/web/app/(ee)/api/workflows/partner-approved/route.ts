import { serve } from "@upstash/workflow/nextjs";

// POST /api/workflows/partner-approved
export const { POST } = serve(
  async (context) => {
    await context.run("initial-step", async () => {
      console.log("initial step ran");
      return;
    });

    await context.run("second-step", async () => {
      console.log("second step ran");
      return;
    });
  },
  // {
  //   verbose: true,
  // },
);
