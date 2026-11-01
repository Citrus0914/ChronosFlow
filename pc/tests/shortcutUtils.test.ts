import { describe, it, expect } from 'vitest';
import {
  isCommandBarShortcut,
  isEscapeKey,
  isSlashQuickKey,
  getPlatformShortcutLabel,
} from '../src/lib/shortcutUtils';

describe('shortcutUtils 快捷键检测单元测试', () => {
  it('正确识别 Ctrl + K 与 Cmd + K', () => {
    // Windows/Linux Ctrl + K
    expect(
      isCommandBarShortcut({
        key: 'k',
        ctrlKey: true,
      })
    ).toBe(true);

    expect(
      isCommandBarShortcut({
        key: 'K',
        ctrlKey: true,
      })
    ).toBe(true);

    // Mac Cmd + K
    expect(
      isCommandBarShortcut({
        key: 'k',
        metaKey: true,
      })
    ).toBe(true);

    expect(
      isCommandBarShortcut({
        key: 'K',
        metaKey: true,
      })
    ).toBe(true);
  });

  it('正确识别 Alt + Space (包括多种 key/code/keyCode 兼容情况)', () => {
    // 标准 code === Space
    expect(
      isCommandBarShortcut({
        key: ' ',
        code: 'Space',
        altKey: true,
      })
    ).toBe(true);

    // key === Spacebar (部分 Windows 浏览器)
    expect(
      isCommandBarShortcut({
        key: 'Spacebar',
        altKey: true,
      })
    ).toBe(true);

    // keyCode === 32
    expect(
      isCommandBarShortcut({
        key: '',
        keyCode: 32,
        altKey: true,
      })
    ).toBe(true);
  });

  it('正确识别 Ctrl + / 与 Cmd + /', () => {
    expect(
      isCommandBarShortcut({
        key: '/',
        ctrlKey: true,
      })
    ).toBe(true);

    expect(
      isCommandBarShortcut({
        key: '',
        code: 'Slash',
        metaKey: true,
      })
    ).toBe(true);
  });

  it('普通输入或不匹配的组合键不应误触', () => {
    // 仅按 Space
    expect(
      isCommandBarShortcut({
        key: ' ',
        code: 'Space',
      })
    ).toBe(false);

    // 仅按 k
    expect(
      isCommandBarShortcut({
        key: 'k',
      })
    ).toBe(false);

    // Alt + k
    expect(
      isCommandBarShortcut({
        key: 'k',
        altKey: true,
      })
    ).toBe(false);
  });

  it('正确识别未聚焦输入框时的单键 /', () => {
    // 未聚焦输入框时按 /
    expect(
      isSlashQuickKey(
        {
          key: '/',
        },
        false
      )
    ).toBe(true);

    // 已聚焦输入框时不应触发
    expect(
      isSlashQuickKey(
        {
          key: '/',
        },
        true
      )
    ).toBe(false);

    // 带 Ctrl 键不触发单键 /
    expect(
      isSlashQuickKey(
        {
          key: '/',
          ctrlKey: true,
        },
        false
      )
    ).toBe(false);
  });

  it('正确识别 Escape 键', () => {
    expect(isEscapeKey({ key: 'Escape' })).toBe(true);
    expect(isEscapeKey({ key: 'Esc' })).toBe(true);
    expect(isEscapeKey({ key: '', keyCode: 27 })).toBe(true);
    expect(isEscapeKey({ key: 'Enter' })).toBe(false);
  });

  it('返回当前平台的主次快捷键展示标签', () => {
    const labels = getPlatformShortcutLabel();
    expect(labels).toHaveProperty('primary');
    expect(labels).toHaveProperty('secondary');
    expect(labels.secondary).toBe('Alt + Space');
  });
});
