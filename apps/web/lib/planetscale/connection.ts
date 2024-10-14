import { connect } from "@planetscale/database";

export const conn = connect({
  url: process.env.PLANETSCALE_DATABASE_URL || process.env.DATABASE_URL,
});
