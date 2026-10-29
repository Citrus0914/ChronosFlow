import { describe, it, expect, beforeEach } from 'vitest';
import { evaluatePace, getCurrentWeekTimeProgress } from '../src/lib/paceUtils';
import { matchProjectFromText } from '../src/services/nlpParser';
import { useTimeStore } from '../src/store/useTimeStore';
import type { ProjectGoal } from '../src/types';

describe('🎯 目标计划与时间预算系统 (Goals & Budgets)', () => {
  beforeEach(() => {
    useTimeStore.getState().clearAllActivities();
  });

  describe('1. 节奏健康度算法评估 (Pace & Health)', () => {
    it('周一早晨与周日晚上时间进度百分比应符合边界约束', () => {
      // 模拟周一上午 00:00 (以 2026-10-26 周一为例)
      const mondayMidnight = new Date('2026-10-26T00:00:00');
      const progressMonday = getCurrentWeekTimeProgress(mondayMidnight);
      expect(progressMonday).toBe(0);

      // 模拟周日深夜 23:59 (以 2026-11-01 周日为例)
      const sundayNight = new Date('2026-11-01T23:59:00');
      const progressSunday = getCurrentWeekTimeProgress(sundayNight);
      expect(progressSunday).toBeGreaterThan(0.99);
      expect(progressSunday).toBeLessThanOrEqual(1.0);
    });

    it('下限达标型 (AT_LEAST)：达到 100% 时判定为已达成 (COMPLETED)', () => {
      const midWeek = new Date('2026-10-28T12:00:00'); // 周三中午，约 36%
      const result = evaluatePace(1200, 20, 'AT_LEAST', midWeek); // 20h 目标，已投入 20h (1200min)
      expect(result.status).toBe('COMPLETED');
      expect(result.percent).toBe(100);
      expect(result.label).toBe('已达成');
    });

    it('下限达标型 (AT_LEAST)：落后时间进度时判定为进度滞后 (BEHIND)', () => {
      const thursdayNight = new Date('2026-10-29T20:00:00'); // 周四晚上，时间已过约 55%
      // 20h 目标，仅投入 2h (120min)，即 10%
      const result = evaluatePace(120, 20, 'AT_LEAST', thursdayNight);
      expect(result.status).toBe('BEHIND');
      expect(result.label).toBe('进度滞后');
    });

    it('上限克制型 (AT_MOST)：超出 100% 时判定为已超预算 (EXCEEDED)', () => {
      const midWeek = new Date('2026-10-28T12:00:00');
      // 上限 10h，已投入 11h (660min)
      const result = evaluatePace(660, 10, 'AT_MOST', midWeek);
      expect(result.status).toBe('EXCEEDED');
      expect(result.label).toBe('已超预算');
    });

    it('上限克制型 (AT_MOST)：保持克制时判定为克制健康 (HEALTHY)', () => {
      const midWeek = new Date('2026-10-28T12:00:00'); // 时间已过约 36%
      // 上限 10h，仅投入 1h (60min)，即 10%
      const result = evaluatePace(60, 10, 'AT_MOST', midWeek);
      expect(result.status).toBe('HEALTHY');
      expect(result.label).toBe('克制健康');
    });
  });

  describe('2. 专属项目语义匹配与 #标签提取', () => {
    const mockProjects: ProjectGoal[] = [
      {
        id: 'proj-chronos',
        name: 'ChronosFlow开发',
        color: '#6366f1',
        category: '开发/技术',
        keywords: ['时流', 'chronos', 'rust'],
        targetHours: 30,
        period: 'WEEKLY',
        budgetType: 'AT_LEAST',
        createdAt: Date.now(),
        isArchived: false,
      },
      {
        id: 'proj-english',
        name: '考研英语',
        color: '#ec4899',
        category: '学习/提升',
        keywords: ['背单词', '真题', '阅读'],
        targetHours: 15,
        period: 'TOTAL',
        budgetType: 'AT_LEAST',
        createdAt: Date.now(),
        isArchived: false,
      },
    ];

    it('显式 #标签 优先匹配对应项目并剥离标签文本', () => {
      const text = '#ChronosFlow开发 修复了时间轴微徽章渲染Bug 45分钟';
      const match = matchProjectFromText(text, mockProjects);
      expect(match.projectId).toBe('proj-chronos');
      expect(match.extractedTags).toContain('ChronosFlow开发');
      expect(match.textWithoutHashtags).not.toContain('#ChronosFlow开发');
    });

    it('大白话无标签时，通过关键词自动匹配项目', () => {
      const text = '刚背了半小时考研英语真题';
      const match = matchProjectFromText(text, mockProjects);
      expect(match.projectId).toBe('proj-english');
    });
  });

  describe('3. 项目管理与时间累计闭环', () => {
    it('添加项目并随手记后，项目投入时长应正确累积', async () => {
      const store = useTimeStore.getState();

      const newProj = store.addProjectGoal({
        name: '软考冲刺',
        color: '#10b981',
        category: '学习/提升',
        keywords: ['软考', '系统架构师'],
        targetHours: 20,
        period: 'WEEKLY',
        budgetType: 'AT_LEAST',
      });

      expect(newProj.id).toBeDefined();

      // 随手记一条触发该关键词的事项
      await store.submitNaturalInput('学习软考系统架构师教材 2小时');

      const minutes = store.getProjectDurationMinutes(newProj.id, 'TOTAL');
      expect(minutes).toBe(120);

      // 归档状态切换
      store.toggleArchiveProject(newProj.id);
      const archived = useTimeStore.getState().projectGoals.find((p) => p.id === newProj.id);
      expect(archived?.isArchived).toBe(true);

      // 删除项目
      store.deleteProjectGoal(newProj.id);
      const exists = useTimeStore.getState().projectGoals.find((p) => p.id === newProj.id);
      expect(exists).toBeUndefined();
    });
  });
});
