import { serve } from "inngest/next";
import { inngest, importLinks } from "#/lib/inngest";

export default serve(inngest, [importLinks]);
