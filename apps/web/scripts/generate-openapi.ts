import { document } from "@/lib/openapi";
import fs from "fs";
import path from "path";

fs.writeFileSync(
  path.join(__dirname, "../../docs", "openapi.json"),
  JSON.stringify(document, null, 2),
);
