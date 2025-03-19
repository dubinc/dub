import baseX from "base-x";
import crypto from "crypto";

const prefixes = [
  "ws_",
  "user_",
  "link_",
  "tag_",
  "fold_",
  "dom_",
  "po_",
  "dash_",
  "int_",
  "app_",
  "cus_",
  "utm_",
  "wh_",
  "pn_",
  "prog_",
  "pga_",
  "pgi_",
  "pge_",
  "pgr_",
  "inv_",
  "cm_",
  "rw_",
  "disc_",
  "dub_embed_",
] as const;

// ULID uses base32 encoding
const base32 = baseX("0123456789ABCDEFGHJKMNPQRSTVWXYZ");

// Creates a ULID-compatible buffer (48 bits timestamp + 80 bits randomness)
function createULIDBuffer(): Uint8Array {
  const buf = new Uint8Array(16); // 128 bits total

  // Timestamp (48 bits = 6 bytes)
  const timestamp = BigInt(Date.now());
  buf[0] = Number((timestamp >> BigInt(40)) & BigInt(255));
  buf[1] = Number((timestamp >> BigInt(32)) & BigInt(255));
  buf[2] = Number((timestamp >> BigInt(24)) & BigInt(255));
  buf[3] = Number((timestamp >> BigInt(16)) & BigInt(255));
  buf[4] = Number((timestamp >> BigInt(8)) & BigInt(255));
  buf[5] = Number(timestamp & BigInt(255));

  // Randomness (80 bits = 10 bytes)
  crypto.getRandomValues(buf.subarray(6));

  return buf;
}

// Creates a unique, time-sortable ID with an optional prefix
export const createId = ({
  prefix,
}: {
  prefix?: (typeof prefixes)[number];
}) => {
  const buf = createULIDBuffer();
  const id = base32.encode(buf);

  return `${prefix || ""}${id}`;
};
