import { serve } from "inngest/next";
import inngest from "#/lib/inngest";
import { importBitlyLinks } from "#/lib/api/import";

export default serve(inngest, [importBitlyLinks]);
