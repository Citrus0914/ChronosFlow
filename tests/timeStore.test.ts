import { describe, it, expect, beforeEach } from 'vitest';
import { useTimeStore } from '../src/store/useTimeStore';

describe('ChronosFlow TimeStore Toast & Feedback', () => {
  beforeEach(() => {
    useTimeStore.getState().hideToast();
  });

  it('事后记录提交应当弹出保存成功 Toast 提示', async () => {
    const store = useTimeStore.getState();
    await store.submitNaturalInput('刚才花了45分钟开架构评审会');

    const toast = useTimeStore.getState().toast;
    expect(toast).not.toBeNull();
    expect(toast?.type).toBe('SUCCESS');
    expect(toast?.title).toBe('✨ 时间流已成功保存');
    expect(toast?.message).toContain('架构评审会');
    expect(toast?.message).toContain('45 分钟');
  });

  it('实时专注启动应当弹出专注启动 Toast 提示', async () => {
    const store = useTimeStore.getState();
    await store.submitNaturalInput('开始复习操作系统');

    const toast = useTimeStore.getState().toast;
    expect(toast).not.toBeNull();
    expect(toast?.type).toBe('SUCCESS');
    expect(toast?.title).toBe('🎯 实时专注已启动');
    expect(toast?.message).toContain('操作系统');
  });

  it('完成结算任务应当弹出结算归档 Toast 提示', async () => {
    const store = useTimeStore.getState();
    // 确保有活跃任务
    store.startRealtimeActivity('测试任务', '开发/技术', ['测试']);
    
    // 提交“完成了”
    await store.submitNaturalInput('完成了');

    const toast = useTimeStore.getState().toast;
    expect(toast).not.toBeNull();
    expect(toast?.title).toBe('✅ 任务已结算归档');
  });

  it('随手记解析策略应默认开启零消耗规则模式，节约 Token', () => {
    const settings = useTimeStore.getState().settings;
    expect(settings.enableAIQuickParse).toBe(false);
  });

  it('手动精确添加时间块应当正确持久化并弹出提示', () => {
    const store = useTimeStore.getState();
    const now = Date.now();
    const act = store.addManualActivity({
      rawInput: '手动补录 14:00-15:00',
      title: '手动精确会议',
      category: '工作/业务',
      tags: ['会议'],
      startTime: now - 3600000,
      endTime: now,
      durationMinutes: 60,
      status: 'COMPLETED',
      mood: 'FOCUSED',
    });

    expect(act.title).toBe('手动精确会议');
    expect(useTimeStore.getState().activities.some((a) => a.id === act.id)).toBe(true);
    expect(useTimeStore.getState().toast?.title).toBe('✨ 时间块已精确归档');
  });
});
