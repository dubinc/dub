-- Manual PlanetScale VECTOR index for partner natural-language search. Prisma can't
-- express the VECTOR INDEX distance/options, so create it here after Prisma has pushed
-- the embedding column (the same-named @@index in the schema just stops db push from
-- dropping it). The name + distance must match PARTNER_CONTENT_CHUNK_VECTOR_INDEX /
-- _DISTANCE in lib/partner-content-search/constants.ts; vector-index-sync.test.ts
-- enforces it, and the search routes' FORCE INDEX hint depends on it.
CREATE /*vt+ QUERY_TIMEOUT_MS=0 */
  VECTOR INDEX partner_content_chunk_embedding_cosine_idx
  ON PartnerContentChunk(embedding)
  SECONDARY_ENGINE_ATTRIBUTE='{"type":"spann", "distance":"cosine"}';
