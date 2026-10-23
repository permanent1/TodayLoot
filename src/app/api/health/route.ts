import { NextResponse } from 'next/server';
import { getServerConfig, liveReady } from '@/lib/server/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getServerConfig();
  return NextResponse.json(
    {
      ok: true,
      aiMode: config.aiMode,
      liveReady: liveReady(config),
      tripoEnabled: config.enableTripo && Boolean(config.tripoKey),
      model: config.dashscopeModel,
      demoAccessCodeRequired: Boolean(config.demoAccessCode),
      maxImageMb: config.maxImageMb,
      maxDailyLiveRequests: config.maxDailyLiveRequests,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
