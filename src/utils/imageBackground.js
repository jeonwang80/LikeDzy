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

export function loadBackgroundCanvas(url, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => { img.onload = img.onerror = null; reject(new Error('사진을 불러오는 시간이 길어지고 있습니다. 다시 시도하거나 직접 지정해 주세요.')); }, 15000);
    img.onerror = () => { clearTimeout(timer); reject(new Error('이 사진의 배경색을 읽을 수 없습니다. 직접 지정해 주세요.')); };
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.getImageData(0, 0, 1, 1); // Verify pixel access before offering the picker.
        resolve(canvas);
      } catch { reject(new Error('이 사진의 배경색을 읽을 수 없습니다. 직접 지정해 주세요.')); }
    };
    const source = new URL(url, window.location.href);
    // Separate CORS reads from the regular display image cached without CORS.
    if (source.hostname === 'firebasestorage.googleapis.com') source.searchParams.set('backgroundRead', 'v2');
    img.src = source.href;
  });
}

export async function detectImageBackground(url) {
  const canvas = await loadBackgroundCanvas(url, 128);
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  return sampleEdgeColor(pixels.data, canvas.width, canvas.height);
}

export function sampleCanvasColor(canvas, x, y) {
  const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));
  const [r, g, b, a] = canvas.getContext('2d').getImageData(px, py, 1, 1).data;
  if (a < 240) return null;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
