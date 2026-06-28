export function formatProgramAnalyticsForExport(rows: Record<string, any>[]) {
  return rows.map(({ groupByField, link, ...row }) => {
    if (row.partner) {
      row.partner = {
        name: row.partner.name,
        email: row.partner.email,
        country: row.partner.country,
      };
    }

    if (row.group) {
      row.group = {
        name: row.group.name,
      };
    }

    if (row.partnerTag) {
      row.partnerTag = {
        name: row.partnerTag.name,
      };
    }

    return row;
  });
}

export function formatPartnerAnalyticsForExport(rows: Record<string, any>[]) {
  return rows.map(({ groupByField, link, folderId, partnerId, ...row }) => row);
}
