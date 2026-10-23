'use client';

import type { DemoSampleId } from '@/types';

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE = 1024;

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  mime: string;
  width: number;
  height: number;
  hash: string;
}

export function validateImage(file: File): string | null {
  const type = file.type.toLowerCase();
  const normalized = type === 'image/jpg' ? 'image/jpeg' : type;
  if (!ACCEPTED_MIME.includes(normalized as (typeof ACCEPTED_MIME)[number])) {
    return '仅支持 JPG、PNG 或 WebP 图片';
  }
  if (file.size > MAX_INPUT_BYTES) {
    return `图片不能超过 ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)}MB`;
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败，请换一张试试'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片压缩失败'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const data =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function rasterize(
  img: HTMLImageElement,
  maxEdge = MAX_EDGE,
  quality = 0.86,
): Promise<ProcessedImage> {
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  if (!naturalWidth || !naturalHeight) throw new Error('图片尺寸无效');

  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持图片处理');
  context.fillStyle = '#0a0f1b';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, quality);
  const dataUrl = await blobToDataUrl(blob);
  const hash = await sha256Hex(await blob.arrayBuffer());
  return { blob, dataUrl, mime: 'image/jpeg', width, height, hash };
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const error = validateImage(file);
  if (error) throw new Error(error);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await rasterize(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 把项目自带的样例照片转成 JPG，走与相机照片完全相同的管线 */
export async function processSampleImage(url: string): Promise<ProcessedImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('样例图片加载失败');
  const svgBlob = await response.blob();
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(objectUrl);
    return await rasterize(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function buildRequestKey(params: {
  imageHash: string;
  mode: string;
  persona: string;
  note: string;
  promptVersion: string;
  engineVersion: string;
}): Promise<string> {
  return sha256Hex(
    [
      params.imageHash,
      params.mode,
      params.persona,
      params.note.trim(),
      params.promptVersion,
      params.engineVersion,
    ].join('|'),
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DemoSample {
  id: DemoSampleId;
  label: string;
  hint: string;
  url: string;
}

/**
 * 样例全部使用仓库 images/ 下的实物照片（同步发布到 /images），
 * 点开后与相册上传走完全相同的压缩与识别管线。
 */
export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'yogurt',
    label: '希腊风味酸奶',
    hint: '办公桌实拍',
    url: '/images/image1.jpg',
  },
  {
    id: 'keyboard',
    label: '蓝白机械键盘',
    hint: '工作台实拍',
    url: '/images/image5.jpg',
  },
  {
    id: 'mouse',
    label: '白色无线鼠标',
    hint: '工位实拍',
    url: '/images/image2.jpg',
  },
];
