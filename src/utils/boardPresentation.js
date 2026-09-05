export const safeRating = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(5, Math.max(1, Math.round(number))) : 5;
};

export const toSafeDate = (value) => {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
};
