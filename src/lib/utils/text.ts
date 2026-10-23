/** 去掉标签与危险字符，用于展示模型/用户文本（不含 HTML 渲染） */
export function sanitizeText(input: unknown, maxLength = 400): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNote(input: unknown, maxLength = 60): string {
  return sanitizeText(input, maxLength);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromIso: string, now = Date.now()): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.floor((now - from) / 86400000));
}

/**
 * 附言注入只做分类，不执行。
 * 返回是否命中“此地无银”类指令，用于规则层扣分与词条，不改变抽样。
 */
export function detectNoteInjection(note: string): boolean {
  if (!note) return false;
  const patterns = [
    /给我出红/,
    /帮我出红/,
    /让我出红/,
    /给我加分/,
    /帮我加分/,
    /忽略(上面|之前|所有|以上)?(的)?(指令|规则|提示)/,
    /ignore (all|previous|above)/i,
    /system prompt/i,
    /一定要(出|给).{0,4}(红|传说|史诗)/,
  ];
  return patterns.some((p) => p.test(note));
}
