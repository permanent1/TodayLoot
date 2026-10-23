'use client';

import type { CollectionItem } from '@/types';
import { RARITY_META } from '@/features/game/rarity';
import { formatCoins } from '@/features/game/scoring';
import { formatDate } from '@/lib/utils/text';

const W = 1080;
const H = 1620;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const joined = lines.join('');
    if (joined.length < text.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
    }
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function createCardPoster(
  item: CollectionItem,
  imageUrl: string | null,
  cutoutUrl?: string | null,
): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持海报导出');

  const meta = RARITY_META[item.rarity];
  const font = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';

  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 320, 60, W / 2, 520, 760);
  glow.addColorStop(0, meta.color);
  glow.addColorStop(1, 'rgba(7,11,20,0)');
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  rounded(ctx, 45, 45, W - 90, H - 90, 46);
  ctx.strokeStyle = `${meta.color}55`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#8b96ad';
  ctx.font = `500 22px ${font}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('ZERO APPRAISAL BUREAU · TODAY LOOT', 90, 130);

  ctx.fillStyle = '#e9e2d2';
  ctx.font = `600 30px ${font}`;
  ctx.letterSpacing = '2px';
  ctx.fillText(item.mode === 'keep' ? '藏品证书' : '藏品档案', 90, 180);

  ctx.fillStyle = meta.color;
  ctx.font = `600 26px ${font}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${meta.icon} ${meta.label}`, W - 90, 178);
  ctx.textAlign = 'left';

  const imgX = 90;
  const imgY = 220;
  const imgW = W - 180;
  const imgH = 730;
  const cutout = cutoutUrl ? await loadImage(cutoutUrl) : null;

  if (cutout && cutout.width > 0 && cutout.height > 0) {
    const stageGlow = ctx.createRadialGradient(
      W / 2,
      imgY + imgH / 2,
      40,
      W / 2,
      imgY + imgH / 2,
      imgW / 2,
    );
    stageGlow.addColorStop(0, `${meta.color}30`);
    stageGlow.addColorStop(1, 'rgba(7,11,20,0)');
    ctx.fillStyle = stageGlow;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(W / 2, imgY + imgH - 40, 250, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.filter = 'blur(18px)';
    ctx.fill();
    ctx.restore();

    const scale = Math.min((imgW - 60) / cutout.width, (imgH - 60) / cutout.height);
    const dw = cutout.width * scale;
    const dh = cutout.height * scale;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 26;
    ctx.drawImage(
      cutout,
      imgX + (imgW - dw) / 2,
      imgY + (imgH - dh) / 2,
      dw,
      dh,
    );
    ctx.restore();
  } else {
    const img = imageUrl ? await loadImage(imageUrl) : null;
    rounded(ctx, imgX, imgY, imgW, imgH, 30);
    ctx.save();
    ctx.clip();
    if (img) {
      const scale = Math.max(imgW / img.width, imgH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, imgX + (imgW - dw) / 2, imgY + (imgH - dh) / 2, dw, dh);
    } else {
      const fallback = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
      fallback.addColorStop(0, '#111a2b');
      fallback.addColorStop(1, '#080c16');
      ctx.fillStyle = fallback;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.fillStyle = `${meta.color}44`;
      ctx.font = `300 220px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText(meta.icon, imgX + imgW / 2, imgY + imgH / 2 + 70);
      ctx.textAlign = 'left';
    }
    const shade = ctx.createLinearGradient(0, imgY + imgH - 220, 0, imgY + imgH);
    shade.addColorStop(0, 'rgba(7,11,20,0)');
    shade.addColorStop(1, 'rgba(7,11,20,0.92)');
    ctx.fillStyle = shade;
    ctx.fillRect(imgX, imgY + imgH - 220, imgW, 220);
    ctx.restore();

    rounded(ctx, imgX, imgY, imgW, imgH, 30);
    ctx.strokeStyle = `${meta.color}40`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#f4f0e6';
  ctx.font = `700 72px ${font}`;
  ctx.fillText(item.name.slice(0, 12), 90, 1075);

  ctx.fillStyle = '#8b96ad';
  ctx.font = `400 28px ${font}`;
  ctx.fillText(`${item.category} · ${item.scene}`, 90, 1122);

  ctx.fillStyle = meta.color;
  ctx.font = `600 26px ${font}`;
  ctx.fillText('◎', 92, 1192);
  ctx.fillStyle = '#f0e2c4';
  ctx.font = `600 38px ${font}`;
  ctx.fillText(
    `${formatCoins(item.worth.low)} ~ ${formatCoins(item.worth.high)}`,
    125,
    1192,
  );

  let chipX = 90;
  ctx.font = `500 22px ${font}`;
  item.affixes.slice(0, 3).forEach((affix) => {
    const textW = ctx.measureText(affix).width;
    const chipW = textW + 36;
    if (chipX + chipW > W - 90) return;
    rounded(ctx, chipX, 1225, chipW, 46, 14);
    ctx.fillStyle = `${meta.color}16`;
    ctx.fill();
    ctx.strokeStyle = `${meta.color}44`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `${meta.color}ee`;
    ctx.fillText(affix, chipX + 18, 1257);
    chipX += chipW + 12;
  });

  ctx.fillStyle = '#b9c2d3';
  ctx.font = `400 26px ${font}`;
  const descLines = wrap(ctx, item.desc.replace(/\n+/g, ' '), W - 180, 4);
  descLines.forEach((line, index) => {
    ctx.fillText(line, 90, 1340 + index * 42);
  });

  const footerY = 1512;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(90, footerY - 32);
  ctx.lineTo(W - 90, footerY - 32);
  ctx.stroke();

  ctx.fillStyle = '#6f7a90';
  ctx.font = `400 22px ${font}`;
  ctx.fillText(`NO.${item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`, 90, footerY);
  ctx.textAlign = 'right';
  ctx.fillText(`${formatDate(item.createdAt)} · 今天出货了吗？`, W - 90, footerY);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#4d5668';
  ctx.font = `400 18px ${font}`;
  ctx.fillText('藏品描述为文学杜撰，◎ 数值仅为游戏内展示，不代表真实价格。', 90, 1552);

  if (item.analysisSource === 'mock') {
    ctx.save();
    ctx.translate(W - 210, 1420);
    ctx.rotate(-0.16);
    ctx.strokeStyle = 'rgba(166,124,255,0.5)';
    ctx.lineWidth = 3;
    rounded(ctx, 0, 0, 200, 74, 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(166,124,255,0.75)';
    ctx.font = `600 28px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText('演示数据', 100, 47);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('海报生成失败'))),
      'image/png',
    );
  });
}
