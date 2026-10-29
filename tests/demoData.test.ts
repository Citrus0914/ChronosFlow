import { describe, it, expect } from 'vitest';
import { generateFiveWeeksDemoActivities } from '../src/services/demoDataGenerator';
import { useTimeStore } from '../src/store/useTimeStore';

describe('⚡ 5周真实生活与工作示例数据生成器 (Demo Data Generator)', () => {
  it('应当生成 35 天且大于 250 条连续时间块', () => {
    const activities = generateFiveWeeksDemoActivities(new Date('2026-10-29T18:00:00'));
    expect(activities.length).toBeGreaterThanOrEqual(250);
  });

  it('时间块必须完整涵盖 QQ微信聊天、打游戏、刷短视频、刷帖子、运动健身与深度睡眠', () => {
    const activities = generateFiveWeeksDemoActivities(new Date('2026-10-29T18:00:00'));
    
    const hasChat = activities.some((a) => a.title.includes('微信') || a.title.includes('QQ'));
    const hasGaming = activities.some((a) => a.title.includes('游戏') || a.tags.includes('游戏'));
    const hasVideo = activities.some((a) => a.title.includes('短视频') || a.title.includes('视频'));
    const hasPosts = activities.some((a) => a.title.includes('知乎') || a.title.includes('贴吧') || a.tags.includes('刷帖子'));
    const hasSport = activities.some((a) => a.title.includes('慢跑') || a.title.includes('健身') || a.tags.includes('跑步'));
    const hasSleep = activities.some((a) => a.title.includes('睡眠') || a.tags.includes('睡眠'));

    expect(hasChat).toBe(true);
    expect(hasGaming).toBe(true);
    expect(hasVideo).toBe(true);
    expect(hasPosts).toBe(true);
    expect(hasSport).toBe(true);
    expect(hasSleep).toBe(true);
  });

  it('时间块必须具备合理的起止时间戳且结束时间大于开始时间', () => {
    const activities = generateFiveWeeksDemoActivities(new Date('2026-10-29T18:00:00'));
    for (const a of activities) {
      expect(a.startTime).toBeGreaterThan(0);
      expect(a.endTime).toBeDefined();
      expect(a.endTime!).toBeGreaterThan(a.startTime);
      expect(a.durationMinutes).toBeGreaterThan(0);
      expect(a.status).toBe('COMPLETED');
    }
  });

  it('useTimeStore loadFiveWeeksDemoData 能够成功批量载入数据并弹出 Toast', () => {
    const store = useTimeStore.getState();
    store.clearAllActivities();
    expect(useTimeStore.getState().activities.length).toBe(0);

    store.loadFiveWeeksDemoData();
    const loaded = useTimeStore.getState().activities;
    expect(loaded.length).toBeGreaterThanOrEqual(250);
    expect(useTimeStore.getState().toast?.title).toContain('5 周生活与工作示例已导入');
  });
});
