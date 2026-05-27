export function formatAnalyticsForExport(rows: Record<string, any>[]) {
  return rows.map(({ groupByField: _groupByField, ...row }) => {
    if (row.partner) {
      row.partner = { name: row.partner.name, country: row.partner.country };
    }

    if (row.group) {
      row.group = { name: row.group.name };
    }

    if (row.partnerTag) {
      row.partnerTag = { name: row.partnerTag.name };
    }

    return row;
  });
}
