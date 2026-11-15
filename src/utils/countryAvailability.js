// The storefront currently checks out to Vietnam; IP remains a separate sales
// permission. Once destination selection launches, pass that destination here.
export function countryAvailability(row, country = 'VN') {
  if (row.allocationVersion !== 1) return row;
  return { ...row, available: Math.max(0, Number(row.availableByCountry?.[country]) || 0) };
}
