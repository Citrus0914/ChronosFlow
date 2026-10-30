import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseWithRules } from '../src/services/nlpParser';
import { useTimeStore } from '../src/store/useTimeStore';

describe('实时专注提醒与目标时长 (Focus Reminder & Duration)', () => {
  beforeEach(() => {
    // 重置 Zustand store 状态
    useTimeStore.setState({
      activities: [],
      activeActivity: null,
      isAlarmRinging: false,
    });
  });

  describe('NLP 语法解析提取专注目标时长', () => {
    it('应当识别“开始写代码 25分钟”为带有 25 分钟目标时长的实时专注', () => {
      const res = parseWithRules('开始写代码 25分钟');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(25);
      expect(res.title).toBe('写代码');
      expect(res.category).toBe('开发/技术');
    });

    it('应当识别“开始读书半小时”为 30 分钟目标时长的实时专注', () => {
      const res = parseWithRules('开始读书半小时');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(30);
      expect(res.title).toBe('读书');
      expect(res.category).toBe('学习/提升');
    });

    it('应当识别“开始做方案 1小时”为 60 分钟目标时长的实时专注', () => {
      const res = parseWithRules('开始做方案 1小时');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(60);
      expect(res.title).toBe('做方案');
      expect(res.category).toBe('工作/业务');
    });

    it('当输入未指定时长如“开始写前端架构代码”时，目标时长应为 0', () => {
      const res = parseWithRules('开始写前端架构代码');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(0);
      expect(res.title).toContain('前端架构代码');
      expect(res.category).toBe('开发/技术');
    });
  });

  describe('TimeStore 实时专注状态与时长管理', () => {
    it('启动专注时应能正确存入 targetDurationMinutes', () => {
      const store = useTimeStore.getState();
      const act = store.startActivity('深度攻坚', '开发/技术', '开始深度攻坚 25分钟', 25);
      expect(act.targetDurationMinutes).toBe(25);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(25);
    });

    it('支持手动调整正在进行中的专注提醒时长 (setFocusTargetDuration)', () => {
      const store = useTimeStore.getState();
      store.startActivity('论文阅读', '学习/提升', '开始论文阅读');
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBeUndefined();

      // 手动设为 45 分钟
      store.setFocusTargetDuration(45);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(45);

      // 手动清除目标为自由计时
      store.setFocusTargetDuration(null);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBeUndefined();
    });

    it('支持延长专注时间 (extendFocusTime)', () => {
      const store = useTimeStore.getState();
      store.startActivity('写需求文档', '工作/业务', '开始写需求文档 20分钟', 20);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(20);

      // 延长 5 分钟
      store.extendFocusTime(5);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(25);
    });

    it('触发响铃与关闭响铃状态流转 (triggerAlarm & dismissAlarm)', () => {
      const store = useTimeStore.getState();
      store.startActivity('冥想放松', '休息/睡眠', '开始冥想 15分钟', 15);

      expect(useTimeStore.getState().isAlarmRinging).toBe(false);

      // 触发响铃
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 关闭响铃
      store.dismissAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);
    });

    it('结束专注时应当自动复位响铃状态', () => {
      const store = useTimeStore.getState();
      store.startActivity('测试任务', '开发/技术', '开始测试 10分钟', 10);
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 结束活跃任务
      store.stopActiveActivity();
      expect(useTimeStore.getState().activeActivity).toBeNull();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);
    });
  });
});
