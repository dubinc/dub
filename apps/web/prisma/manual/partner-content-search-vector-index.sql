-- Manual PlanetScale index DDL for partner natural-language search.
--
-- Prisma manages the PartnerContentChunk.embedding VECTOR(1024) column through
-- Unsupported("vector(1024)") in apps/web/prisma/schema/partner-content-search.prisma.
-- Run this after Prisma has created the column on the target PlanetScale branch.
-- The schema includes a same-named @@index only so Prisma db push preserves this
-- manual index; Prisma cannot define the VECTOR INDEX distance/options below.
--
-- The index name and distance metric below are the same values the search routes
-- feed into their FORCE INDEX hint and DISTANCE() call (if they diverge, the
-- planner falls back to a full scan). They mirror PARTNER_CONTENT_CHUNK_VECTOR_INDEX
-- and PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE in
-- apps/web/lib/partner-content-search/constants.ts; the match is enforced by
-- apps/web/tests/partner-content-search/vector-index-sync.test.ts.
CREATE /*vt+ QUERY_TIMEOUT_MS=0 */
  VECTOR INDEX partner_content_chunk_embedding_cosine_idx
  ON PartnerContentChunk(embedding)
  SECONDARY_ENGINE_ATTRIBUTE='{"type":"spann", "distance":"cosine"}';

-- Optional verification once the table has enough rows for the planner to use
-- the vector index:
--
-- EXPLAIN
-- SELECT c.id,
--        DISTANCE(TO_VECTOR('[0, ...]'), c.embedding, 'cosine') AS distance
-- FROM PartnerContentChunk c
-- WHERE c.embedding IS NOT NULL
-- ORDER BY distance ASC
-- LIMIT 10;
