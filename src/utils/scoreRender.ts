export function getStyleColor(colorClass: string) {
    return colorClass.replace('text-[', '').replace(']', '');
}

export function escapeSvgText(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function buildScoreRenderSvg(score: string, label: string, emoji: string, color: string) {
    return `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="20%" r="48%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#151515"/>
      <stop offset="100%" stop-color="#242424"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" rx="56" fill="url(#bg)"/>
  <rect width="1080" height="1080" rx="56" fill="url(#glow)"/>
  <rect x="28" y="28" width="1024" height="1024" rx="44" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>
  <text x="540" y="322" text-anchor="middle" dominant-baseline="middle" font-size="132">${escapeSvgText(emoji)}</text>
  <text x="540" y="526" text-anchor="middle" dominant-baseline="middle" font-family="Arial Black, Arial, sans-serif" font-size="184" font-weight="900" fill="${color}">${escapeSvgText(score)}</text>
  <text x="540" y="644" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="8" fill="rgba(242,242,242,0.58)">WALLET SCORE</text>
  <rect x="300" y="726" width="480" height="96" rx="48" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-opacity="0.34" stroke-width="2"/>
  <text x="540" y="776" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="${color}">${escapeSvgText(label)}</text>
</svg>`.trim();
}

export function scoreRenderFileName(label: string, extension: 'png' | 'svg' = 'png') {
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'score';
    return `wallet-score-${safeLabel}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
    if (typeof URL.createObjectURL !== 'function') return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function downloadScoreRenderSvg(score: string, label: string, emoji: string, color: string) {
    const svg = buildScoreRenderSvg(score, label, emoji, color);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), scoreRenderFileName(label, 'svg'));
}

export function downloadScoreRenderPng(score: string, label: string, emoji: string, color: string) {
    const canvas = document.createElement('canvas');
    const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');

    if (isJsdom || typeof canvas.toBlob !== 'function') {
        downloadScoreRenderSvg(score, label, emoji, color);
        return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
        downloadScoreRenderSvg(score, label, emoji, color);
        return;
    }

    const svg = buildScoreRenderSvg(score, label, emoji, color);
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    canvas.width = 1080;
    canvas.height = 1080;

    image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
            if (pngBlob) {
                downloadBlob(pngBlob, scoreRenderFileName(label, 'png'));
            }
        }, 'image/png');
    };

    image.onerror = () => {
        URL.revokeObjectURL(url);
        downloadScoreRenderSvg(score, label, emoji, color);
    };

    image.src = url;
}
