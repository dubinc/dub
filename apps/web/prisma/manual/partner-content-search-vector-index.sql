-- Manual PlanetScale DDL for partner natural-language search.
--
-- Prisma intentionally does not manage the PartnerContentChunk.embedding
-- VECTOR(1024) column because plain MySQL cannot parse VECTOR DDL in CI/local
-- `prisma db push` jobs. Run this after Prisma has created the
-- PartnerContentChunk table on the target PlanetScale branch.
--
-- Keep the index distance in sync with the search query in:
-- apps/web/app/(ee)/api/admin/partner-content/search/route.ts
-- That query currently uses DISTANCE(..., 'cosine'); if these metrics differ,
-- PlanetScale cannot use the vector index and will fall back to a full scan.

ALTER TABLE PartnerContentChunk
  ADD COLUMN embedding VECTOR(1024) NULL;

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
