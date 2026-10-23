import 'server-only';

export type AiMode = 'mock' | 'live';

export interface ServerConfig {
  aiMode: AiMode;
  allowLiveAppraise: boolean;
  dashscopeKey: string;
  dashscopeModel: string;
  dashscopeBaseUrl: string;
  enableTripo: boolean;
  tripoKey: string;
  tripoBaseUrl: string;
  demoAccessCode: string;
  maxImageMb: number;
  maxDailyLiveRequests: number;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getServerConfig(): ServerConfig {
  const aiMode: AiMode = process.env.AI_MODE === 'live' ? 'live' : 'mock';
  return {
    aiMode,
    allowLiveAppraise: process.env.ALLOW_LIVE_APPRAISE === 'true',
    dashscopeKey: process.env.DASHSCOPE_API_KEY?.trim() ?? '',
    dashscopeModel: process.env.DASHSCOPE_MODEL?.trim() || 'qwen3.8-flash',
    dashscopeBaseUrl:
      process.env.DASHSCOPE_BASE_URL?.trim().replace(/\/+$/, '') ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    enableTripo: process.env.ENABLE_TRIPO === 'true',
    tripoKey: process.env.TRIPO_API_KEY?.trim() ?? '',
    tripoBaseUrl:
      process.env.TRIPO_BASE_URL?.trim().replace(/\/+$/, '') ||
      'https://openapi.tripo3d.ai/v3',
    demoAccessCode: process.env.DEMO_ACCESS_CODE?.trim() ?? '',
    maxImageMb: num(process.env.MAX_IMAGE_MB, 8),
    maxDailyLiveRequests: num(process.env.MAX_DAILY_LIVE_REQUESTS, 20),
  };
}

export function liveReady(config: ServerConfig): boolean {
  return Boolean(
    config.aiMode === 'live' &&
      config.allowLiveAppraise &&
      config.dashscopeKey,
  );
}
