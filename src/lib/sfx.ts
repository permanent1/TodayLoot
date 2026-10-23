'use client';

import type { Rarity } from '@/types';

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  delay = 0,
): void {
  const audio = ctx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export type SfxName = 'tap' | 'scan' | 'reveal' | Rarity;

export function playSfx(name: SfxName, enabled: boolean): void {
  if (!enabled) return;
  switch (name) {
    case 'tap':
      tone(520, 0.06, 'sine', 0.05);
      break;
    case 'scan':
      tone(220, 0.12, 'triangle', 0.04);
      tone(330, 0.1, 'sine', 0.03, 0.14);
      break;
    case 'common':
      tone(392, 0.16, 'sine', 0.055);
      break;
    case 'fine':
      tone(440, 0.14, 'sine', 0.06);
      tone(554, 0.18, 'sine', 0.05, 0.1);
      break;
    case 'rare':
      tone(523, 0.16, 'sine', 0.06);
      tone(659, 0.2, 'sine', 0.055, 0.1);
      tone(784, 0.26, 'sine', 0.05, 0.2);
      break;
    case 'epic':
      tone(523, 0.18, 'triangle', 0.06);
      tone(659, 0.18, 'triangle', 0.055, 0.1);
      tone(784, 0.2, 'triangle', 0.05, 0.2);
      tone(1046, 0.4, 'sine', 0.055, 0.32);
      break;
    case 'legendary':
      tone(130, 0.5, 'sawtooth', 0.025);
      tone(392, 0.22, 'triangle', 0.06, 0.05);
      tone(523, 0.22, 'triangle', 0.06, 0.15);
      tone(659, 0.24, 'triangle', 0.06, 0.25);
      tone(784, 0.3, 'sine', 0.07, 0.36);
      tone(1046, 0.7, 'sine', 0.06, 0.5);
      break;
    case 'reveal':
      tone(330, 0.18, 'sine', 0.05);
      tone(494, 0.24, 'sine', 0.045, 0.12);
      break;
    default:
      break;
  }
}
