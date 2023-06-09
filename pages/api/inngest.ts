import { serve } from "inngest/next";
import { helloWorld, inngest } from "#/lib/inngest";

export default serve(inngest, [helloWorld]);
