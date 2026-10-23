'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box, MousePointer2 } from 'lucide-react';

/**
 * 3D 陈列位：
 * - 传入 src 且文件存在时，用 Tripo 生成的 .glb 渲染真实藏品
 * - 文件缺失 / 加载失败 / 无 WebGL 时回退到程序化样例，并如实标注
 */

function SampleRelic() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.28;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.05;
  });

  return (
    <group ref={group} position={[0, 0.05, 0]}>
      <mesh castShadow>
        <torusKnotGeometry args={[0.58, 0.17, 180, 26]} />
        <meshStandardMaterial
          color="#f7c66a"
          metalness={0.92}
          roughness={0.22}
          emissive="#6b4413"
          emissiveIntensity={0.32}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.18, 0.009, 12, 140]} />
        <meshBasicMaterial color="#a67cff" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, 0.4, 0]}>
        <torusGeometry args={[1.32, 0.006, 12, 140]} />
        <meshBasicMaterial color="#f7c66a" transparent opacity={0.35} />
      </mesh>

      <mesh position={[0, -1.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.02, 1.2, 0.12, 56]} />
        <meshStandardMaterial color="#101827" metalness={0.7} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.99, 0]}>
        <torusGeometry args={[0.95, 0.012, 12, 100]} />
        <meshBasicMaterial color="#f7c66a" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function GlbRelic({ url, onFail }: { url: string; onFail: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [scene, setScene] = useState<THREE.Object3D | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    let alive = true;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!alive) return;
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.1 / maxDim;
        root.scale.setScalar(scale);
        root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        setScene(root);
        invalidate();
      },
      undefined,
      () => {
        if (alive) onFail();
      },
    );
    return () => {
      alive = false;
    };
  }, [url, onFail, invalidate]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.32;
  });

  return <group ref={group}>{scene ? <primitive object={scene} /> : null}</group>;
}

export default function ModelViewer({
  src,
  checkUrl,
  title = '样例模型 · 非本照片生成',
  modelLabel = 'Tripo 生成 · 可旋转',
  localLabel = '本地建模 · 可旋转',
}: {
  src?: string;
  checkUrl?: string;
  title?: string;
  modelLabel?: string;
  localLabel?: string;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [modelState, setModelState] = useState<'idle' | 'ready' | 'missing'>('idle');
  const [badge, setBadge] = useState(title);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    setSupported(Boolean(gl));
  }, []);

  useEffect(() => {
    if (!src) {
      setBadge(title);
      return;
    }
    let alive = true;
    fetch(checkUrl ?? src, { cache: 'no-store' })
      .then(async (response) => {
        if (!alive) return;
        if (!checkUrl) {
          if (response.ok) {
            setModelState('ready');
            setBadge(modelLabel);
          } else {
            setModelState('missing');
            setBadge(title);
          }
          return;
        }
        const payload = (await response.json()) as {
          exists?: boolean;
          meta?: { generator?: string } | null;
        };
        if (payload?.exists) {
          setModelState('ready');
          setBadge(payload.meta?.generator === 'tripo' ? modelLabel : localLabel);
        } else {
          setModelState('missing');
          setBadge(title);
        }
      })
      .catch(() => {
        if (!alive) return;
        setModelState('missing');
        setBadge(title);
      });
    return () => {
      alive = false;
    };
  }, [src, checkUrl, title, modelLabel, localLabel]);

  const handleFail = () => {
    setModelState('missing');
    setBadge(title);
  };

  if (supported === null) {
    return (
      <div className="grid h-[320px] place-items-center rounded-2xl border border-white/[0.06] bg-[#080d17]">
        <span className="text-[10px] tracking-[0.16em] text-white/30">正在检测 3D 能力…</span>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-[#080d17] px-6 text-center">
        <Box className="h-6 w-6 text-white/25" />
        <p className="text-[11px] text-white/50">当前设备或浏览器未启用 WebGL</p>
        <p className="text-[9px] leading-relaxed text-white/25">
          3D 展示为可选增强，不影响卡片、鉴定与展厅的任何功能。
        </p>
      </div>
    );
  }

  const useGlb = Boolean(src) && modelState === 'ready';

  return (
    <div className="keep-dark relative h-[340px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_35%,#1a2235,#080c16_70%)] lg:h-[420px]">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: [0, 0.5, 3.5], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <spotLight
          position={[3.2, 4.5, 2.6]}
          angle={0.5}
          penumbra={0.6}
          intensity={45}
          castShadow
          color="#ffe5b8"
        />
        <pointLight position={[-2.6, 1.4, -1.8]} intensity={18} color="#a67cff" />
        <directionalLight position={[-2, 3, 2]} intensity={1.2} color="#ffffff" />
        {useGlb && src ? <GlbRelic url={src} onFail={handleFail} /> : <SampleRelic />}
        <ContactShadows position={[0, -1.03, 0]} opacity={0.55} scale={6} blur={2.6} far={2} />
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.4}
          minDistance={2.4}
          maxDistance={5.4}
          maxPolarAngle={Math.PI / 1.85}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full border border-violet/30 bg-black/40 px-2 py-0.5 text-[8px] tracking-[0.12em] text-violet backdrop-blur">
          {badge}
        </span>
        <span className="flex items-center gap-1 text-[8px] text-white/30">
          <MousePointer2 className="h-3 w-3" />
          拖动旋转 / 滚轮缩放
        </span>
      </div>
      {src && modelState === 'missing' && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 backdrop-blur">
          <p className="text-[8.5px] leading-relaxed text-white/35">
            还没有生成 3D 文件，这里显示的是程序化样例几何。
          </p>
        </div>
      )}
    </div>
  );
}
