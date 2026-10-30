import { describe, it, expect, beforeEach } from 'vitest';
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

  describe('NLP 实时专注启动契约', () => {
    it('实时专注启动时默认时长应为 0（纯净正向计时）', () => {
      const res = parseWithRules('开始写代码');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(0);
      expect(res.title).toContain('写代码');
      expect(res.category).toBe('开发/技术');
    });

    it('无论输入何种开始指令，实时启动均保持纯净走秒，不预设目标时长', () => {
      const res = parseWithRules('开始写前端架构代码');
      expect(res.isRealtimeStart).toBe(true);
      expect(res.durationMinutes).toBe(0);
      expect(res.title).toContain('前端架构代码');
    });

    it('事后追溯补录仍正常提取分钟数', () => {
      const res = parseWithRules('刚刚看书花了25分钟');
      expect(res.isRealtimeStart).toBe(false);
      expect(res.durationMinutes).toBe(25);
      expect(res.category).toBe('学习/提升');
    });
  });

  describe('TimeStore 实时专注状态：开启专注后由用户点击按键手动指定时间', () => {
    it('启动专注初始状态应为自由计时（targetDurationMinutes 为空）', () => {
      const store = useTimeStore.getState();
      const act = store.startActivity('深度攻坚', '开发/技术', '开始深度攻坚');
      expect(act.targetDurationMinutes).toBeUndefined();
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBeUndefined();
    });

    it('点击按键后手动指定目标提醒时长 (setFocusTargetDuration)', () => {
      const store = useTimeStore.getState();
      store.startActivity('论文阅读', '学习/提升', '开始论文阅读');
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBeUndefined();

      // 用户点击按键，在弹窗中手动指定为 25 分钟
      store.setFocusTargetDuration(25);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(25);

      // 用户点击按键二次微调为 45 分钟
      store.setFocusTargetDuration(45);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(45);

      // 用户点击“自由计时”清除目标
      store.setFocusTargetDuration(null);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBeUndefined();
    });

    it('支持延长专注时间 (extendFocusTime)', () => {
      const store = useTimeStore.getState();
      store.startActivity('写需求文档', '工作/业务', '开始写需求文档');
      store.setFocusTargetDuration(20);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(20);

      // 延长 5 分钟
      store.extendFocusTime(5);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(25);
    });

    it('触发响铃与关闭响铃状态流转 (triggerAlarm & dismissAlarm)', () => {
      const store = useTimeStore.getState();
      store.startActivity('冥想放松', '休息/睡眠', '开始冥想');
      store.setFocusTargetDuration(15);

      expect(useTimeStore.getState().isAlarmRinging).toBe(false);

      // 目标到达触发响铃
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 关闭响铃
      store.dismissAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);
    });

    it('结束专注时应当自动复位响铃状态', () => {
      const store = useTimeStore.getState();
      store.startActivity('测试任务', '开发/技术', '开始测试');
      store.setFocusTargetDuration(10);
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 结束活跃任务
      store.stopActiveActivity();
      expect(useTimeStore.getState().activeActivity).toBeNull();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);
    });

    it('多重防重守卫：同一专注目标时长绝不重复触发多重响铃', () => {
      const store = useTimeStore.getState();
      store.startActivity('核心算法开发', '开发/技术', '开始开发');
      store.setFocusTargetDuration(25);

      // 第一次触发
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 连续第二次、第三次重复触发，防重守卫拦截
      store.triggerAlarm();
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);

      // 关闭响铃后，由于同一 session 已触发，未延长前不再重复弹起
      store.dismissAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(false);

      // 用户延长 5 分钟，重置 session，到期后允许再次响铃
      store.extendFocusTime(5);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(30);
      store.triggerAlarm();
      expect(useTimeStore.getState().isAlarmRinging).toBe(true);
    });

    it('专属目标项目开启专注时可直接绑定指定时长 (startRealtimeActivity)', () => {
      const store = useTimeStore.getState();
      const act = store.startRealtimeActivity(
        'ChronosFlow移动端',
        '开发/技术',
        ['开发', 'React'],
        'proj_123',
        30
      );

      expect(act.title).toBe('ChronosFlow移动端');
      expect(act.projectId).toBe('proj_123');
      expect(act.targetDurationMinutes).toBe(30);
      expect(useTimeStore.getState().activeActivity?.targetDurationMinutes).toBe(30);
    });
  });
});
