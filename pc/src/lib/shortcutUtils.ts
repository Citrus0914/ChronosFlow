/**
 * 快捷键辅助检测与平台兼容工具
 */

export interface KeyboardEventLike {
  key: string;
  code?: string;
  keyCode?: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

/**
 * 判断是否触发了呼出/切换 CommandBar 的组合键
 * 1. Ctrl + K / Cmd + K (行业标准，无任何系统菜单冲突，首选推荐)
 * 2. Alt + Space (兼容 Windows/Linux/Mac 的 Alt+空格)
 * 3. Ctrl + / 或 Cmd + / (备用辅助组合键)
 */
export function isCommandBarShortcut(e: KeyboardEventLike): boolean {
  // 1. Ctrl + K 或 Cmd + K
  const isCtrlOrCmd = Boolean(e.ctrlKey || e.metaKey);
  if (isCtrlOrCmd && (e.key === 'k' || e.key === 'K')) {
    return true;
  }

  // 2. Alt + Space (捕获并兼容不同输入法与系统环境)
  if (
    e.altKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32)
  ) {
    return true;
  }

  // 3. Ctrl + / 或 Cmd + /
  if (isCtrlOrCmd && (e.key === '/' || e.code === 'Slash')) {
    return true;
  }

  return false;
}

/**
 * 判断是否在未聚焦输入框时按下了单键 '/'
 */
export function isSlashQuickKey(e: KeyboardEventLike, isInputFocused: boolean): boolean {
  if (isInputFocused) return false;
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return false;
  return e.key === '/' || e.code === 'Slash';
}

/**
 * 判断是否触发了 Escape 退出键
 */
export function isEscapeKey(e: KeyboardEventLike): boolean {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
}

/**
 * 获取当前平台首选的主按键提示符号 (Mac 为 ⌘K, Windows/Linux 为 Ctrl+K)
 */
export function getPlatformShortcutLabel(): { primary: string; secondary: string } {
  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));

  return {
    primary: isMac ? '⌘K' : 'Ctrl + K',
    secondary: 'Alt + Space',
  };
}
