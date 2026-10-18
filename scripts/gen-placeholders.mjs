// Sinh ảnh minh họa SVG (placeholder) cho điểm đến/tour/bài viết.
// Thay bằng ảnh thật (WebP/AVIF) khi có: chỉ cần đổi đường dẫn ảnh trong admin.
import fs from "node:fs";
import path from "node:path";

const out = path.resolve("public/images");
fs.mkdirSync(out, { recursive: true });

const palettes = {
  dawn: ["#fde68a", "#f9a8d4", "#0f766e", "#115e59", "#134e4a"],
  day: ["#bae6fd", "#e0f2fe", "#14b8a6", "#0f766e", "#064e3b"],
  dusk: ["#fdba74", "#c084fc", "#7c3aed", "#4c1d95", "#1e1b4b"],
  sea: ["#a5f3fc", "#f0fdfa", "#06b6d4", "#0e7490", "#164e63"],
  rice: ["#fef9c3", "#d9f99d", "#84cc16", "#4d7c0f", "#365314"],
  night: ["#1e3a8a", "#6366f1", "#312e81", "#1e1b4b", "#0f172a"],
  sakura: ["#fce7f3", "#fbcfe8", "#f472b6", "#be185d", "#831843"],
};

function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function ridge(r, y, amp, w = 1200, steps = 9) {
  let d = `M0 ${y}`;
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i;
    const cy = y - amp * (0.4 + r());
    d += ` Q${x - w / steps / 2} ${cy} ${x} ${y - amp * r() * 0.6}`;
  }
  return d + ` L${w} 900 L0 900 Z`;
}

function scene(kind, pal, seed) {
  const r = rnd(seed);
  const [sky1, sky2, c1, c2, c3] = palettes[pal];
  const sun = `<circle cx="${300 + r() * 600}" cy="${180 + r() * 120}" r="${50 + r() * 40}" fill="#fff" opacity=".55"/>`;
  let body = "";
  if (kind === "mountain" || kind === "rice") {
    body = `<path d="${ridge(r, 470, 220)}" fill="${c1}" opacity=".55"/>
<path d="${ridge(r, 590, 200)}" fill="${c2}" opacity=".8"/>
<path d="${ridge(r, 720, 150)}" fill="${c3}"/>`;
    if (kind === "rice")
      for (let i = 0; i < 6; i++)
        body += `<path d="M0 ${700 + i * 35} Q600 ${660 + i * 35} 1200 ${700 + i * 35}" stroke="${sky2}" stroke-opacity=".35" stroke-width="3" fill="none"/>`;
  } else if (kind === "sea") {
    body = `<path d="${ridge(r, 520, 120, 1200, 4)}" fill="${c2}" opacity=".6"/>
<rect y="560" width="1200" height="340" fill="${c1}"/>
<rect y="640" width="1200" height="260" fill="${c2}" opacity=".7"/>
<path d="M0 830 Q300 780 600 820 T1200 800 L1200 900 L0 900Z" fill="#fde68a"/>`;
    for (let i = 0; i < 5; i++)
      body += `<path d="M${r() * 1100} ${590 + i * 40} q30 -8 60 0" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/>`;
    // karst nhô lên biển (Hạ Long)
    for (let i = 0; i < 4; i++) {
      const x = 100 + r() * 1000, h = 80 + r() * 160;
      body += `<path d="M${x - 50} 580 Q${x - 40} ${580 - h} ${x} ${580 - h} Q${x + 40} ${580 - h} ${x + 50} 580Z" fill="${c3}" opacity=".85"/>`;
    }
  } else {
    // city
    body = `<path d="${ridge(r, 560, 80, 1200, 5)}" fill="${c1}" opacity=".4"/>`;
    let x = 0;
    while (x < 1200) {
      const w = 50 + r() * 90, h = 120 + r() * 320;
      body += `<rect x="${x}" y="${720 - h}" width="${w}" height="${h + 200}" fill="${c2}" opacity="${0.6 + r() * 0.4}"/>`;
      for (let wy = 740 - h; wy < 700; wy += 30)
        if (r() > 0.4) body += `<rect x="${x + 10}" y="${wy}" width="${w - 20}" height="8" fill="${sky1}" opacity=".35"/>`;
      x += w + 6;
    }
    body += `<rect y="720" width="1200" height="180" fill="${c3}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
<rect width="1200" height="900" fill="url(#g)"/>${sun}${body}</svg>`;
}

const sets = {
  hanoi: ["city", ["dusk", "dawn", "night", "day", "dusk"]],
  "ha-giang": ["mountain", ["dawn", "day", "dusk", "rice", "day"]],
  sapa: ["rice", ["rice", "day", "dawn", "rice", "dusk"]],
  "ninh-binh": ["mountain", ["rice", "dawn", "day", "dusk", "rice"]],
  "ha-long-bay": ["sea", ["sea", "dawn", "day", "dusk", "sea"]],
  hue: ["city", ["dawn", "dusk", "day", "night", "dawn"]],
  "hoi-an": ["city", ["dusk", "dawn", "night", "dusk", "day"]],
  "phu-quoc": ["sea", ["sea", "dusk", "day", "dawn", "sea"]],
  "mekong-delta": ["rice", ["day", "rice", "dawn", "dusk", "day"]],
  "ho-chi-minh-city": ["city", ["night", "dusk", "day", "dawn", "night"]],
  hero: ["mountain", ["dawn"]],
};
let seed = 7;
for (const [name, [kind, pals]] of Object.entries(sets)) {
  pals.forEach((p, i) => {
    fs.writeFileSync(path.join(out, `${name}-${i + 1}.svg`), scene(kind, p, seed++ * 13));
  });
}
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0F766E"/><text x="80" y="330" font-family="sans-serif" font-size="96" font-weight="700" fill="#fff">AmGo Travel</text><text x="80" y="410" font-family="sans-serif" font-size="40" fill="#ccfbf1">Small-group &amp; private tours in Vietnam</text></svg>`;
fs.writeFileSync(path.join(out, "og-default.svg"), og);
console.log("ok", fs.readdirSync(out).length);
