import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE,
  PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
} from "@/lib/partner-content-search/constants";

// The index name + distance metric are hardcoded in both the .sql DDL and the Prisma
// @@index (neither can import the TS constant), so assert they match the constants.
describe("partner content search vector index", () => {
  const read = (relativePath: string) =>
    readFileSync(join(process.cwd(), relativePath), "utf8");

  test("manual DDL matches the index name and distance constants", () => {
    const ddl = read(
      "prisma/manual/partner-content-search-vector-index.sql",
    );

    expect(ddl).toContain(`VECTOR INDEX ${PARTNER_CONTENT_CHUNK_VECTOR_INDEX}`);
    expect(ddl).toContain(`"distance":"${PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE}"`);
  });

  test("prisma @@index map matches the index name constant", () => {
    const schema = read("prisma/schema/partner-content-search.prisma");

    expect(schema).toContain(`map: "${PARTNER_CONTENT_CHUNK_VECTOR_INDEX}"`);
  });
});
