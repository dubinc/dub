import baseX from "base-x";
import crypto from "crypto";

const prefixes = [
  "ws_", // workspace
  "user_", // user
  "link_", // link
  "tag_", // tag
  "fold_", // folder
  "dom_", // domain
  "po_", // payout
  "dash_", // dashboard
  "int_", // integration
  "app_", // oauth app
  "cus_", // customer
  "utm_", // utm template
  "wh_", // webhook
  "pn_", // partner
  "prog_", // program
  "pga_", // program application
  "pgi_", // program invitation
  "pge_", // program enrollment
  "pgr_", // program resources
  "pgdl_", // program group default link
  "inv_", // invoice
  "cm_", // commission
  "rw_", // reward
  "disc_", // discount
  "dub_embed_", // dub embed
  "audit_", // audit log
  "import_", // import log
  "grp_", // group
  "bnty_", // bounty
  "bnty_sub_", // bounty submission
  "wf_", // workflow
  "msg_", // message
  "em_", // notification email,
  "cmp_", // campaign
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
export const createId = ({ prefix }: { prefix: (typeof prefixes)[number] }) => {
  const buf = createULIDBuffer();
  const id = base32.encode(buf);

  return `${prefix}${id}`;
};
