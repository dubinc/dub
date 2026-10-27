import { PartnerSearchHit } from "./types";

export function orderByPartnerSearchHits<T extends { id: string }>(
  records: T[],
  hits: PartnerSearchHit[],
): T[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));

  return hits.flatMap(({ id }) => {
    const record = recordsById.get(id);
    return record ? [record] : [];
  });
}
