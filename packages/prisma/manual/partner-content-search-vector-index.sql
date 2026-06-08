-- Manual PlanetScale DDL for partner natural-language search.
--
-- Prisma can create the PartnerContentChunk.embedding VECTOR(1024) column via
-- `prisma db push`, but it cannot express PlanetScale VECTOR INDEX DDL. Run
-- this after the PartnerContentChunk table and embedding column exist on the
-- target PlanetScale branch.
--
-- Keep the index distance in sync with the search query in:
-- apps/web/app/(ee)/api/admin/partner-content/search/route.ts
-- That query currently uses DISTANCE(..., 'cosine'); if these metrics differ,
-- PlanetScale cannot use the vector index and will fall back to a full scan.

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
