import { conn } from "@/lib/planetscale";

export async function updateLinkOrDomain({
  id,
  clicks,
}: {
  id: string;
  clicks: number;
}) {
  let res = await conn.execute(
    "UPDATE Link SET clicks = clicks + ?, lastClicked = NOW() WHERE id = ?",
    [clicks, id],
  );

  if (res.rowsAffected === 0) {
    res = await conn.execute(
      "UPDATE Domain SET clicks = clicks + ?, lastClicked = NOW() WHERE id = ?",
      [clicks, id],
    );
  }
  console.log(res);

  return res;
}

export async function updateProjectUsage({
  projectId,
  clicks,
}: {
  projectId: string;
  clicks: number;
}) {
  return await conn.execute(
    "UPDATE Project SET usage = usage + ? WHERE id = ?",
    [clicks, projectId],
  );
}
