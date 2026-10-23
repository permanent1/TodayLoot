import { NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/server/config';
import { getTask, TripoError } from '@/lib/server/tripo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 只读查询任务状态，客户端自行决定轮询节奏，服务端不做后台重试。 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const config = getServerConfig();
  if (!config.enableTripo || !config.tripoKey) {
    return NextResponse.json(
      { error: { code: 'tripo_disabled', message: '3D 建模服务未开通' } },
      { status: 503 },
    );
  }

  const { taskId } = await params;
  if (!taskId || taskId.length > 128) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: '任务编号无效' } },
      { status: 400 },
    );
  }

  try {
    const state = await getTask(taskId);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof TripoError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: 'unknown', message: '查询 3D 任务失败' } },
      { status: 500 },
    );
  }
}
