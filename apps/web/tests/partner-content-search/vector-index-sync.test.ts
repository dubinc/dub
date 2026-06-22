import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE,
  PARTNER_CONTENT_CHUNK_VECTOR_INDEX,
} from "@/lib/partner-content-search/constants";

// The manual PlanetScale VECTOR index DDL and the Prisma @@index drift guard both
// hardcode the index name + distance metric because neither a .sql file nor the
// Prisma schema can import a TS constant. These assertions are the enforcement
// that replaces the old "keep in sync" comments: if the constant and either file
// disagree, this fails instead of silently shipping an unusable index.
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
