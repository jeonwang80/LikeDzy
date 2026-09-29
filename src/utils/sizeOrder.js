const sizeRank = (option) => {
  const name = String(option?.name ?? option ?? '').trim().toUpperCase();
  const standard = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL'];
  const rank = standard.indexOf(name);
  if (rank !== -1) return rank;
  const repeated = /^(X{2,})L$/.exec(name);
  const numbered = /^(\d+)XL$/.exec(name);
  if (repeated) return 5 + repeated[1].length;
  if (numbered && Number(numbered[1]) >= 1) return 5 + Number(numbered[1]);
  return null;
};

// Sort recognized clothing sizes in their existing slots; preserve custom sizes.
export function sortSizeOptions(options = []) {
  const ordered = options.filter((option) => sizeRank(option) !== null)
    .sort((a, b) => sizeRank(a) - sizeRank(b));
  let index = 0;
  return options.map((option) => sizeRank(option) === null ? option : ordered[index++]);
}
