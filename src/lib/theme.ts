export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'today-loot:theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

/** 由任意组件调用：写入 <html data-theme> 与 localStorage，不触碰藏品数据 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 隐私模式下写入失败时，仅本次会话生效
  }
}

/**
 * 首屏前执行的内联脚本：在 CSS 生效前把主题写到 <html>，避免亮色用户看到黑屏闪烁。
 * 只读取本地偏好，不涉及任何藏品或密钥数据。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
