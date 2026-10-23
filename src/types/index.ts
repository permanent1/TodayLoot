export type Mode = 'hunt' | 'keep';
export type Rarity = 'common' | 'fine' | 'rare' | 'epic' | 'legendary';
export type Persona = 'zhou' | 'k' | 'ali';
/** 内置样例照片的标识，与 public/images 下的真实物品一一对应 */
export type DemoSampleId = 'yogurt' | 'keyboard' | 'mouse';
export type Credibility = 'honest' | 'vague' | 'contradicted' | null;
export type AnalysisSource = 'qwen' | 'mock';
export type ItemStatus = 'pending_lock' | 'kept' | 'destroyed' | 'transferred';
export type RaritySource = 'natural' | 'cycle_pity' | 'daily_pity' | 'newbie';

export interface Dimensions {
  rarity: number;
  surprise: number;
  value: number;
  aesthetic: number;
  craft: number;
  story: number;
  condition: number;
  bond: number;
}

/** 模型原始响应（服务器已完成 Zod 校验与清洗） */
export interface VisionResult {
  name: string;
  category: string;
  scene: string;
  visibleFeatures: string[];
  desc: string;
  dimensions: Dimensions;
  valueScore: number;
  affixes: string[];
  broadcast: string;
  bounty_match: [boolean, boolean, boolean];
  description_bonus: number;
  description_credibility: Credibility;
  image3d_prompt?: string;
  origin?: string;
  story?: string;
  monologue?: string;
  signature?: string;
}

export interface Worth {
  low: number;
  high: number;
}

export interface PlayerDailyState {
  day: string;
  completed: number;
  epicOrAboveSeen: boolean;
  dailyGuaranteeUsed: boolean;
  passesGranted: number;
  modelTasksCreated: number;
}

export interface PlayerState {
  deviceId: string;
  coins: number;
  modelPasses: number;
  totalIdentify: number;
  pity: { epic: number; gold: number; red: number };
  daily: PlayerDailyState;
  configVersion: number;
}

export interface BountyTask {
  id: string;
  title: string;
  detail: string;
  matchIndex: number;
  reward: number;
  claimed: boolean;
}

export interface BountyDay {
  day: string;
  tasks: BountyTask[];
  bonusClaimed: boolean;
}

export interface CollectionItem {
  id: string;
  requestKey: string;
  mode: Mode;
  persona: Persona;
  createdAt: string;
  updatedAt: string;
  name: string;
  category: string;
  scene: string;
  originalImageId: string;
  cutoutImageId?: string;
  exportedCardImageId?: string;
  userNote?: string;
  desc: string;
  affixes: string[];
  origin?: string;
  story?: string;
  monologue?: string;
  signature?: string;
  rarity: Rarity;
  source: RaritySource;
  scores: Record<string, number>;
  scoreTotal: number;
  valueScore: number;
  worth: Worth;
  coinReward: number;
  predictedTier?: Rarity;
  predictedCoins?: number;
  acquiredAt: string;
  lastVisitAt?: string;
  visits?: number;
  maxProcessedAt?: string;
  modelTaskId?: string;
  modelAssetId?: string;
  status: ItemStatus;
  analysisSource: AnalysisSource;
  broadcast: string;
  visibleFeatures: string[];
  bountyHits?: number;
}

export interface GameOutcome {
  rarity: Rarity;
  source: RaritySource;
  scores: Record<string, number>;
  scoreTotal: number;
  worth: Worth;
  coinReward: number;
  luckyStrike: boolean;
  guessHit: boolean;
  coinGuessHit: boolean;
  coinGuessClose: boolean;
  bountyHits: number;
  affixes: string[];
  scoreBreakdown: Record<string, number>;
  nextPlayer: PlayerState;
}

export interface IdentifyMeta {
  source: AnalysisSource;
  demo: boolean;
  model?: string;
  note?: string;
}

export interface IdentifyResponse {
  vision: VisionResult;
  meta: IdentifyMeta;
}
