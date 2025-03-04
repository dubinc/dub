import baseX from "base-x";
import crypto from "crypto";

const prefixes = [
  "user_",
  "link_",
  "tag_",
  "dom_",
  "po_",
  "dash_",
  "int_",
  "app_",
  "cus_",
  "utm_",
  "wh_",
  "pgi_",
  "pge_",
  "pn_",
  "cm_",
  "pga_",
  "dub_embed_",
  "inv_",
  "rw_",
  "fold_",
] as const;

const base58 = baseX(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
);

// Creates a unique, time-sortable ID with an optional prefix
export const createId = ({
  prefix,
  length = 24,
}: {
  prefix?: (typeof prefixes)[number];
  length?: number;
}) => {
  // Start epoch from 2024-01-01 to save space in the ID
  const EPOCH_TIMESTAMP = 1704067200000;
  const t = Date.now() - EPOCH_TIMESTAMP;

  // A buffer with 4 bytes for timestamp and remaining for randomness
  const buf = new Uint8Array(Math.max(12, Math.ceil(length * 0.75)));

  buf[0] = (t >>> 24) & 255;
  buf[1] = (t >>> 16) & 255;
  buf[2] = (t >>> 8) & 255;
  buf[3] = t & 255;

  crypto.getRandomValues(buf.subarray(4));

  const id = base58.encode(buf);

  return `${prefix || ""}${id}`;
};
