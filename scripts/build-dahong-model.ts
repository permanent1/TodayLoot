/**
 * 本地程序化建模：生成「大红 · 芝士奶盖」的 glTF 二进制模型。
 *
 * 为什么不是 Tripo：沙箱访问不到 openapi.tripo3d.ai（DNS 被劫持到无效地址），
 * 无法真实调用 image_to_model。为了演示 3D 模块，这里用纯几何 + PBR 材质
 * 直接生成一个可旋转的 glb，并在 meta 里如实标注「本地程序化建模」，不冒充 Tripo 产物。
 *
 * 用法：npm run model:build
 */
import fs from 'node:fs/promises';
import path from 'node:path';

type Geo = { pos: number[]; idx: number[] };

const TAU = Math.PI * 2;

function sphere(latSeg: number, lonSeg: number, radius: number): Geo {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= latSeg; i++) {
    const theta = (i / latSeg) * Math.PI;
    const y = Math.cos(theta) * radius;
    const r = Math.sin(theta) * radius;
    for (let j = 0; j <= lonSeg; j++) {
      const phi = (j / lonSeg) * TAU;
      pos.push(r * Math.sin(phi), y, r * Math.cos(phi));
    }
  }
  for (let i = 0; i < latSeg; i++) {
    for (let j = 0; j < lonSeg; j++) {
      const a = i * (lonSeg + 1) + j;
      const b = a + lonSeg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, idx };
}

function dome(latSeg: number, lonSeg: number, radius: number, squash: number): Geo {
  const geo = sphere(latSeg, lonSeg, radius);
  for (let i = 0; i < geo.pos.length; i += 3) {
    const y = geo.pos[i + 1];
    geo.pos[i + 1] = y < 0 ? 0 : y * squash;
  }
  return geo;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  seg: number,
  caps: { top?: boolean; bottom?: boolean } = { top: true, bottom: true },
): Geo {
  const pos: number[] = [];
  const idx: number[] = [];
  const yTop = height / 2;
  const yBottom = -height / 2;

  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU;
    const s = Math.sin(a);
    const c = Math.cos(a);
    pos.push(radiusTop * s, yTop, radiusTop * c);
    pos.push(radiusBottom * s, yBottom, radiusBottom * c);
  }
  for (let i = 0; i < seg; i++) {
    const t0 = i * 2;
    const b0 = i * 2 + 1;
    const t1 = (i + 1) * 2;
    const b1 = (i + 1) * 2 + 1;
    idx.push(t0, b0, b1, t0, b1, t1);
  }

  if (caps.top) {
    const center = pos.length / 3;
    pos.push(0, yTop, 0);
    const start = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      pos.push(radiusTop * Math.sin(a), yTop, radiusTop * Math.cos(a));
    }
    for (let i = 0; i < seg; i++) idx.push(center, start + i, start + i + 1);
  }
  if (caps.bottom) {
    const center = pos.length / 3;
    pos.push(0, yBottom, 0);
    const start = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      pos.push(radiusBottom * Math.sin(a), yBottom, radiusBottom * Math.cos(a));
    }
    for (let i = 0; i < seg; i++) idx.push(center, start + i + 1, start + i);
  }
  return { pos, idx };
}

function torus(R: number, r: number, ringSeg: number, tubeSeg: number): Geo {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= ringSeg; i++) {
    const u = (i / ringSeg) * TAU;
    for (let j = 0; j <= tubeSeg; j++) {
      const v = (j / tubeSeg) * TAU;
      const cx = (R + r * Math.cos(v)) * Math.sin(u);
      const cy = r * Math.sin(v);
      const cz = (R + r * Math.cos(v)) * Math.cos(u);
      pos.push(cx, cy, cz);
    }
  }
  for (let i = 0; i < ringSeg; i++) {
    for (let j = 0; j < tubeSeg; j++) {
      const a = i * (tubeSeg + 1) + j;
      const b = a + tubeSeg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, idx };
}

function rotateZ(geo: Geo, angle: number, pivotY = 0): Geo {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const pos = geo.pos.slice();
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1] - pivotY;
    pos[i] = x * c - y * s;
    pos[i + 1] = x * s + y * c + pivotY;
  }
  return { pos, idx: geo.idx };
}

function translate(geo: Geo, dx: number, dy: number, dz: number): Geo {
  const pos = geo.pos.slice();
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += dx;
    pos[i + 1] += dy;
    pos[i + 2] += dz;
  }
  return { pos, idx: geo.idx };
}

/** 面积加权平滑法线；同时按「朝外」自动修正绕序 */
function finalize(geo: Geo) {
  const count = geo.pos.length / 3;
  const normals = new Float32Array(count * 3);
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < geo.pos.length; i += 3) {
    cx += geo.pos[i];
    cy += geo.pos[i + 1];
    cz += geo.pos[i + 2];
  }
  cx /= count;
  cy /= count;
  cz /= count;

  const accumulate = () => {
    normals.fill(0);
    for (let i = 0; i < geo.idx.length; i += 3) {
      const ia = geo.idx[i] * 3;
      const ib = geo.idx[i + 1] * 3;
      const ic = geo.idx[i + 2] * 3;
      const ax = geo.pos[ia];
      const ay = geo.pos[ia + 1];
      const az = geo.pos[ia + 2];
      const e1x = geo.pos[ib] - ax;
      const e1y = geo.pos[ib + 1] - ay;
      const e1z = geo.pos[ib + 2] - az;
      const e2x = geo.pos[ic] - ax;
      const e2y = geo.pos[ic + 1] - ay;
      const e2z = geo.pos[ic + 2] - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      for (const v of [ia, ib, ic]) {
        normals[v] += nx;
        normals[v + 1] += ny;
        normals[v + 2] += nz;
      }
    }
  };

  accumulate();

  let score = 0;
  for (let i = 0; i < count; i++) {
    const dx = geo.pos[i * 3] - cx;
    const dy = geo.pos[i * 3 + 1] - cy;
    const dz = geo.pos[i * 3 + 2] - cz;
    score += dx * normals[i * 3] + dy * normals[i * 3 + 1] + dz * normals[i * 3 + 2];
  }
  if (score < 0) {
    for (let i = 0; i < geo.idx.length; i += 3) {
      const tmp = geo.idx[i + 1];
      geo.idx[i + 1] = geo.idx[i + 2];
      geo.idx[i + 2] = tmp;
    }
    accumulate();
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  return {
    positions: new Float32Array(geo.pos),
    normals,
    indices: new Uint32Array(geo.idx),
  };
}

type Material = {
  name: string;
  color: [number, number, number, number];
  metallic: number;
  roughness: number;
};

const MATERIALS: Material[] = [
  { name: 'milk-tea', color: [0.72, 0.53, 0.36, 1], metallic: 0, roughness: 0.88 },
  { name: 'cheese-foam', color: [1, 0.97, 0.9, 1], metallic: 0, roughness: 0.62 },
  { name: 'cup-rim', color: [0.94, 0.91, 0.86, 1], metallic: 0.15, roughness: 0.38 },
  { name: 'red-label', color: [0.78, 0.16, 0.2, 1], metallic: 0.05, roughness: 0.45 },
  { name: 'straw', color: [0.86, 0.22, 0.26, 1], metallic: 0, roughness: 0.35 },
  { name: 'pearl', color: [0.11, 0.07, 0.06, 1], metallic: 0.25, roughness: 0.3 },
];

const CUP_TOP_RADIUS = 0.62;
const CUP_BOTTOM_RADIUS = 0.45;
const CUP_HEIGHT = 1.24;

const bodyRadius = (y: number) =>
  CUP_BOTTOM_RADIUS + ((CUP_TOP_RADIUS - CUP_BOTTOM_RADIUS) * y) / CUP_HEIGHT;

const parts: { material: number; geo: Geo }[] = [];

// 杯身（奶茶实色，底部收窄）
parts.push({
  material: 0,
  geo: translate(
    cylinder(CUP_TOP_RADIUS, CUP_BOTTOM_RADIUS, CUP_HEIGHT, 72, { top: false, bottom: true }),
    0,
    CUP_HEIGHT / 2,
    0,
  ),
});

// 红色标签带
parts.push({
  material: 3,
  geo: translate(
    cylinder(bodyRadius(0.9) + 0.006, bodyRadius(0.62) + 0.006, 0.28, 72, {
      top: false,
      bottom: false,
    }),
    0,
    0.76,
    0,
  ),
});

// 芝士奶盖（半球压扁）
parts.push({
  material: 1,
  geo: translate(dome(18, 40, 0.62, 0.42), 0, CUP_HEIGHT + 0.02, 0),
});

// 杯口压圈
parts.push({
  material: 2,
  geo: translate(torus(0.605, 0.028, 56, 14), 0, CUP_HEIGHT + 0.01, 0),
});

// 吸管（倾斜插入奶盖）
parts.push({
  material: 4,
  geo: translate(
    rotateZ(cylinder(0.05, 0.05, 1.0, 28, { top: true, bottom: false }), 0.22),
    0.26,
    1.44,
    0.1,
  ),
});

// 珍珠（杯底）
const pearlSeeds: [number, number][] = [
  [0.0, 0.0],
  [0.2, 0.08],
  [-0.18, 0.12],
  [0.1, -0.2],
  [-0.12, -0.16],
  [0.26, -0.18],
];
pearlSeeds.forEach(([x, z], index) => {
  parts.push({
    material: 5,
    geo: translate(sphere(12, 18, 0.082), x, 0.12 + (index % 2) * 0.03, z),
  });
});

// ---------- glTF 装配 ----------

const binChunks: Buffer[] = [];
let byteOffset = 0;
const bufferViews: unknown[] = [];
const accessors: unknown[] = [];

function pushBufferView(data: Buffer, target?: number) {
  const padding = (4 - (byteOffset % 4)) % 4;
  if (padding > 0) {
    binChunks.push(Buffer.alloc(padding));
    byteOffset += padding;
  }
  bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: data.length,
    ...(target ? { target } : {}),
  });
  binChunks.push(data);
  byteOffset += data.length;
  return bufferViews.length - 1;
}

const meshes: unknown[] = [];
const nodes: unknown[] = [];

parts.forEach((part, index) => {
  const { positions, normals, indices } = finalize(part.geo);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }

  const posView = pushBufferView(Buffer.from(positions.buffer), 34962);
  accessors.push({
    bufferView: posView,
    componentType: 5126,
    count: positions.length / 3,
    type: 'VEC3',
    min,
    max,
  });
  const positionAccessor = accessors.length - 1;

  const norView = pushBufferView(Buffer.from(normals.buffer), 34962);
  accessors.push({
    bufferView: norView,
    componentType: 5126,
    count: normals.length / 3,
    type: 'VEC3',
  });
  const normalAccessor = accessors.length - 1;

  const idxView = pushBufferView(Buffer.from(indices.buffer), 34963);
  accessors.push({
    bufferView: idxView,
    componentType: 5125,
    count: indices.length,
    type: 'SCALAR',
  });
  const indexAccessor = accessors.length - 1;

  meshes.push({
    name: `dahong-${index}`,
    primitives: [
      {
        attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
        indices: indexAccessor,
        material: part.material,
        mode: 4,
      },
    ],
  });
  nodes.push({ mesh: meshes.length - 1, name: `dahong-part-${index}` });
});

binChunks.push(Buffer.alloc((4 - (byteOffset % 4)) % 4));

const gltf = {
  asset: {
    version: '2.0',
    generator: 'zero-appraisal-bureau/local-modeler',
    copyright: 'Zero Appraisal Bureau · procedurally generated demo asset',
  },
  scene: 0,
  scenes: [{ name: 'dahong', nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials: MATERIALS.map((material) => ({
    name: material.name,
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: material.color,
      metallicFactor: material.metallic,
      roughnessFactor: material.roughness,
    },
  })),
  accessors,
  bufferViews,
  buffers: [{ byteLength: byteOffset }],
};

const binBuffer = Buffer.concat(binChunks);
const jsonBuffer = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPadded = Buffer.concat([
  jsonBuffer,
  Buffer.alloc((4 - (jsonBuffer.length % 4)) % 4, 0x20),
]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binBuffer.length, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4);

const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binBuffer.length, 0);
binChunkHeader.writeUInt32LE(0x004e4942, 4);

const glb = Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, binBuffer]);

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'models');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'dahong.glb'), glb);
  await fs.writeFile(
    path.join(outDir, 'dahong.meta.json'),
    `${JSON.stringify(
      {
        generator: 'local-procedural',
        tool: 'scripts/build-dahong-model.ts',
        createdAt: new Date().toISOString(),
        bytes: glb.length,
        note: '本地程序化建模，非 Tripo 生成；用于演示 3D 陈列模块',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const triangles = parts.reduce((sum, part) => sum + part.geo.idx.length / 3, 0);
  console.log(
    `已生成 public/models/dahong.glb：${(glb.length / 1024).toFixed(1)}KB，` +
      `${parts.length} 个部件，${Math.round(triangles)} 个三角面`,
  );
}

void main();
