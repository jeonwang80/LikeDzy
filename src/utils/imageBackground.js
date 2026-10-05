export const validBackground = value => /^#[0-9a-f]{6}$/i.test(value || '');

export function getImageBackground(product, imageUrl) {
  const original = product?.imageVariants?.find(item => item.thumbnailUrl === imageUrl)?.imageUrl || imageUrl;
  const entry = product?.imageBackgrounds?.find(item => item.imageUrl === original);
  return validBackground(entry?.color) ? entry.color : undefined;
}

// Choose the most common edge colour cluster; isolated shadows do not dominate.
export function sampleEdgeColor(data, width, height) {
  const buckets = new Map();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x > width * .08 && x < width * .92 && y > height * .08 && y < height * .92) continue;
    const i = (y * width + x) * 4;
    if (data[i + 3] < 240) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const key = rgb.map(v => Math.floor(v / 16)).join(':');
    const bucket = buckets.get(key) || { count: 0, sum: [0, 0, 0] };
    bucket.count++;
    rgb.forEach((v, channel) => { bucket.sum[channel] += v; });
    buckets.set(key, bucket);
  }
  const winner = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  if (!winner) throw new Error('사진 가장자리에서 배경색을 찾지 못했습니다. 직접 지정해 주세요.');
  return '#' + winner.sum.map(v => Math.round(v / winner.count).toString(16).padStart(2, '0')).join('');
}

export function detectImageBackground(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => { img.onload = img.onerror = null; reject(new Error('사진을 불러오는 시간이 길어지고 있습니다. 다시 시도하거나 직접 지정해 주세요.')); }, 15000);
    img.onerror = () => { clearTimeout(timer); reject(new Error('이 사진의 배경색을 읽을 수 없습니다. 직접 지정해 주세요.')); };
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 96; canvas.height = 96;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 96, 96);
        resolve(sampleEdgeColor(ctx.getImageData(0, 0, 96, 96).data, 96, 96));
      } catch { reject(new Error('이 사진의 배경색을 읽을 수 없습니다. 직접 지정해 주세요.')); }
    };
    img.src = url;
  });
}
