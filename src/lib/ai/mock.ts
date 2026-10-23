import type { DemoSampleId, Mode, Persona, VisionResult } from '@/types';
import { seededRngFromString } from '@/features/game/rng';
import { MOCK_FIXTURES, buildMockVision } from './fixtures';

export interface MockIdentifyInput {
  imageHash: string;
  mode: Mode;
  persona: Persona;
  userNote: string;
  bountyIds: string[];
  sampleId?: DemoSampleId;
}

/**
 * 无 Key 时的拟真样例数据。对任意未知图片不伪称真实识别，
 * 前端必须展示「演示识别结果」标识。
 */
export function mockIdentify(input: MockIdentifyInput): VisionResult {
  const { imageHash, mode, persona, userNote, bountyIds, sampleId } = input;
  const rng = seededRngFromString(
    `${imageHash}|${mode}|${persona}|${userNote}|${bountyIds.join(',')}`,
  );
  const matched = sampleId
    ? MOCK_FIXTURES.find((item) => item.id === sampleId)
    : undefined;
  const fixture = matched ?? MOCK_FIXTURES[Math.floor(rng() * MOCK_FIXTURES.length)];
  return buildMockVision({
    fixture,
    mode,
    persona,
    bountyIds,
    noteLength: userNote.length,
    rng,
  });
}
