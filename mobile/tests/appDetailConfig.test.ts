import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimeStore } from '../src/store/useTimeStore';
import { storage } from '../src/services/storage';
import { normalizeCategory, resolveAppDailyState, STANDARD_CATEGORIES } from '../src/types';

describe('应用详情界面配置修改与持久化回归测试', () => {
  const mockUsageToday: Array<{
    packageName: string;
    appName: string;
    foregroundMs: number;
    lastTimeUsed: number;
  }> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    mockUsageToday.length = 0;

    (globalThis as any).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      ChronosNative: {
        hasUsagePermission: () => true,
        openUsageSettings: vi.fn(),
        vibrate: vi.fn(),
        showToast: vi.fn(),
        getAppLabel: (pkg: string) => {
          if (pkg === 'com.tencent.mm') return '微信';
          if (pkg === 'com.xingin.xhs') return '小红书';
          return pkg;
        },
        getAppUsageJson: () => JSON.stringify(mockUsageToday),
      },
    };

    useTimeStore.setState({
      activities: [],
      activeActivity: null,
      appUsageList: [],
      hasUsagePermission: true,
      trackerDayOffset: 0,
      lastScanDateKey: '',
      selectedAppForDetail: null,
      trackedAppConfigs: {
        'com.tencent.mm': {
          packageName: 'com.tencent.mm',
          isTracked: true,
          category: '社交/沟通',
          categories: ['社交/沟通'],
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).window;
  });

  it('修改别名、多分类、关联专属目标与备注后，应同步持久化并实时刷新感知列表与已入流时间块', () => {
    const now = new Date(2026, 9, 30, 14, 0, 0).getTime();
    vi.setSystemTime(now);

    mockUsageToday.push({
      packageName: 'com.tencent.mm',
      appName: '微信',
      foregroundMs: 35 * 60 * 1000,
      lastTimeUsed: now - 10000,
    });

    useTimeStore.getState().scanAppUsage();
    useTimeStore.getState().importAllAppUsages();

    // 模拟旧数据中 tags 缺失的极端防御场景
    const existingAct = useTimeStore.getState().activities[0];
    useTimeStore.setState({
      activities: [{ ...existingAct, tags: undefined as unknown as string[] }],
    });

    // 用户在详情弹窗修改别名、多分类、绑定专属目标、填写备注、选择情绪并点击保存
    useTimeStore.getState().updateAppConfig('com.tencent.mm', {
      customName: '工作微信',
      category: '工作/业务',
      categories: ['工作/业务', '沟通推进'],
      projectId: 'proj-1',
      projectIds: ['proj-1'],
      notes: '仅处理客户对接消息',
      isTracked: true,
      mood: 'FLOW',
    });

    // 1. Store 内存态校验
    const updatedItem = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    expect(updatedItem?.appName).toBe('工作微信');
    expect(updatedItem?.originalAppName).toBe('微信');
    expect(updatedItem?.category).toBe('工作/业务');
    expect(updatedItem?.categories).toEqual(['工作/业务', '沟通推进']);
    expect(updatedItem?.projectId).toBe('proj-1');
    expect(updatedItem?.projectIds).toEqual(['proj-1']);
    expect(updatedItem?.notes).toBe('仅处理客户对接消息');
    expect(updatedItem?.mood).toBe('FLOW');

    // 2. 已入流时间块同步校验
    const updatedAct = useTimeStore.getState().activities[0];
    expect(updatedAct.title).toBe('工作微信');
    expect(updatedAct.category).toBe('工作/业务');
    expect(updatedAct.categories).toEqual(['工作/业务', '沟通推进']);
    expect(updatedAct.projectId).toBe('proj-1');
    expect(updatedAct.projectIds).toEqual(['proj-1']);
    expect(updatedAct.notes).toBe('仅处理客户对接消息');
    expect(updatedAct.mood).toBe('FLOW');

    // 3. 本地持久化与重新扫描校验
    const persisted = storage.getTrackedAppConfigs()['com.tencent.mm'];
    expect(persisted.customName).toBe('工作微信');
    expect(persisted.categories).toEqual(['工作/业务', '沟通推进']);
    expect(persisted.projectIds).toEqual(['proj-1']);
    expect(persisted.mood).toBe('FLOW');

    useTimeStore.getState().scanAppUsage();
    const afterRescan = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    expect(afterRescan?.appName).toBe('工作微信');
    expect(afterRescan?.categories).toEqual(['工作/业务', '沟通推进']);
    expect(afterRescan?.projectIds).toEqual(['proj-1']);
  });

  it('恢复初始名称、取消专属目标绑定、清空备注时，应彻底清除旧值而非回退残留', () => {
    const now = new Date(2026, 9, 30, 15, 0, 0).getTime();
    vi.setSystemTime(now);

    mockUsageToday.push({
      packageName: 'com.tencent.mm',
      appName: '微信',
      foregroundMs: 40 * 60 * 1000,
      lastTimeUsed: now - 5000,
    });

    useTimeStore.getState().scanAppUsage();
    useTimeStore.getState().updateAppConfig('com.tencent.mm', {
      customName: '工作微信',
      category: '工作/业务',
      categories: ['工作/业务', '毕业论文'],
      projectId: 'proj-thesis',
      projectIds: ['proj-thesis'],
      notes: '临时备注',
      isTracked: true,
    });
    useTimeStore.getState().importAllAppUsages();

    expect(useTimeStore.getState().activities[0].title).toBe('工作微信');
    expect(useTimeStore.getState().activities[0].projectId).toBe('proj-thesis');

    // 用户再次打开详情：清空别名恢复初始名称、取消勾选专属目标、清空备注并保存
    useTimeStore.getState().updateAppConfig('com.tencent.mm', {
      customName: '',
      category: '社交/沟通',
      categories: ['社交/沟通'],
      projectId: undefined,
      projectIds: undefined,
      notes: '',
      isTracked: true,
    });

    const item = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    expect(item?.appName).toBe('微信');
    expect(item?.projectId).toBeUndefined();
    expect(item?.projectIds).toBeUndefined();
    expect(item?.notes).toBe('');

    const act = useTimeStore.getState().activities[0];
    expect(act.title).toBe('微信');
    expect(act.projectId).toBeUndefined();
    expect(act.projectIds).toBeUndefined();
    expect(act.notes).toBeUndefined();
  });

  it('在全部感知列表中点开未追踪应用，开启追踪并保存修改后应立即进入追踪列表', () => {
    const now = new Date(2026, 9, 30, 16, 0, 0).getTime();
    vi.setSystemTime(now);

    mockUsageToday.push({
      packageName: 'com.xingin.xhs',
      appName: '小红书',
      foregroundMs: 25 * 60 * 1000,
      lastTimeUsed: now - 8000,
    });

    useTimeStore.getState().scanAppUsage();
    const before = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'com.xingin.xhs');
    expect(before?.isTracked).toBe(false);

    useTimeStore.getState().updateAppConfig('com.xingin.xhs', {
      customName: '',
      category: '创作/灵感',
      categories: ['创作/灵感'],
      notes: '收集排版灵感',
      isTracked: true,
    });

    const after = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'com.xingin.xhs');
    expect(after?.isTracked).toBe(true);
    expect(after?.appName).toBe('小红书');
    expect(after?.category).toBe('创作/灵感');
    expect(after?.notes).toBe('收集排版灵感');
    expect(storage.getTrackedAppConfigs()['com.xingin.xhs']?.cachedAppName).toBe('小红书');
  });

  it('统一分类去重：消除休闲娱乐与休闲/娱乐的重复，统一归一化映射', () => {
    // 1. normalizeCategory 映射校验
    expect(normalizeCategory('休闲娱乐')).toBe('休闲/娱乐');
    expect(normalizeCategory('休闲/生活')).toBe('休闲/娱乐');
    expect(normalizeCategory('娱乐/休闲')).toBe('休闲/娱乐');
    expect(normalizeCategory('娱乐')).toBe('休闲/娱乐');
    expect(normalizeCategory('休闲/娱乐')).toBe('休闲/娱乐');
    expect(normalizeCategory('沟通协作')).toBe('社交/沟通');
    expect(normalizeCategory('学习/阅读')).toBe('学习/提升');
    expect(normalizeCategory('开发/工作')).toBe('开发/技术');
    expect(normalizeCategory('健康/生活')).toBe('健康/运动');
    expect(normalizeCategory('其他工作')).toBe('工作/业务');

    // 2. storage 分类预算去重清洗校验
    const mockBudgets = [
      { category: '休闲娱乐', weeklyTargetHours: 5, budgetType: 'AT_MOST' as const, isEnabled: true },
      { category: '休闲/娱乐', weeklyTargetHours: 8, budgetType: 'AT_MOST' as const, isEnabled: true },
      { category: '休闲/生活', weeklyTargetHours: 3, budgetType: 'AT_MOST' as const, isEnabled: false },
      { category: '其他工作', weeklyTargetHours: 10, budgetType: 'AT_LEAST' as const, isEnabled: true },
    ];
    storage.saveCategoryBudgets(mockBudgets as any);

    const loadedBudgets = storage.getCategoryBudgets();
    // 应该只保留一个统一的“休闲/娱乐”，且时长取较大值 8h，已废弃的“其他工作”被过滤
    const leisureBudgets = loadedBudgets.filter((b) => b.category === '休闲/娱乐');
    expect(leisureBudgets).toHaveLength(1);
    expect(leisureBudgets[0].weeklyTargetHours).toBe(8);
    expect(loadedBudgets.some((b) => b.category === '休闲娱乐')).toBe(false);
    expect(loadedBudgets.some((b) => b.category === '休闲/生活')).toBe(false);
    expect(loadedBudgets.some((b) => b.category === '其他工作')).toBe(false);
  });

  it('每一天的应用使用状况详细信息必须完全独立隔离，绝不互相覆盖', () => {
    const day1 = new Date(2026, 9, 29, 14, 0, 0); // 昨天
    const day2 = new Date(2026, 9, 30, 14, 0, 0); // 今天

    vi.setSystemTime(day1.getTime());
    // 昨天：微信使用 60 分钟，记录为工作沟通，专注状态
    useTimeStore.getState().updateAppConfig(
      'com.tencent.mm',
      {
        customName: '工作微信',
        category: '工作/业务',
        categories: ['工作/业务'],
        notes: '昨天与客户开会',
        mood: 'FOCUSED',
      },
      { targetDate: day1 }
    );

    useTimeStore.getState().addActivity({
      id: 'auto_com_tencent_mm_2026-10-29',
      title: '工作微信',
      rawInput: '使用 工作微信 60分钟',
      category: '工作/业务',
      categories: ['工作/业务'],
      tags: ['自动感知', '工作微信'],
      startTime: day1.getTime(),
      endTime: null,
      durationMinutes: 60,
      status: 'COMPLETED',
      mood: 'FOCUSED',
      notes: '昨天与客户开会',
      isAutoDetected: true,
      sourceAppPackage: 'com.tencent.mm',
    });

    // 切换到今天
    vi.setSystemTime(day2.getTime());
    // 今天：微信只刷朋友圈闲聊，受挫状态，备注文档修改
    useTimeStore.getState().updateAppConfig(
      'com.tencent.mm',
      {
        category: '休闲/娱乐',
        categories: ['休闲/娱乐'],
        notes: '今天摸鱼水群',
        mood: 'DISTRACTED',
      },
      { targetDate: day2 }
    );

    useTimeStore.getState().addActivity({
      id: 'auto_com_tencent_mm_2026-10-30',
      title: '工作微信',
      rawInput: '使用 工作微信 30分钟',
      category: '休闲/娱乐',
      categories: ['休闲/娱乐'],
      tags: ['自动感知', '工作微信'],
      startTime: day2.getTime(),
      endTime: null,
      durationMinutes: 30,
      status: 'COMPLETED',
      mood: 'DISTRACTED',
      notes: '今天摸鱼水群',
      isAutoDetected: true,
      sourceAppPackage: 'com.tencent.mm',
    });

    // 🌟 核心断言：昨天的时间块与今天的配置完全独立！
    const actDay1 = useTimeStore.getState().activities.find((a) => a.id === 'auto_com_tencent_mm_2026-10-29');
    const actDay2 = useTimeStore.getState().activities.find((a) => a.id === 'auto_com_tencent_mm_2026-10-30');

    expect(actDay1?.category).toBe('工作/业务');
    expect(actDay1?.notes).toBe('昨天与客户开会');
    expect(actDay1?.mood).toBe('FOCUSED');

    expect(actDay2?.category).toBe('休闲/娱乐');
    expect(actDay2?.notes).toBe('今天摸鱼水群');
    expect(actDay2?.mood).toBe('DISTRACTED');

    // dailyOverrides 独立存储
    const cfg = useTimeStore.getState().trackedAppConfigs['com.tencent.mm'];
    expect(cfg.dailyOverrides?.['2026-10-29']?.mood).toBe('FOCUSED');
    expect(cfg.dailyOverrides?.['2026-10-29']?.notes).toBe('昨天与客户开会');
    expect(cfg.dailyOverrides?.['2026-10-30']?.mood).toBe('DISTRACTED');
    expect(cfg.dailyOverrides?.['2026-10-30']?.notes).toBe('今天摸鱼水群');
  });

  it('具体状态未知时，默认按前一天的状态继承', () => {
    const day1 = new Date(2026, 9, 28, 12, 0, 0); // 2天前
    const day2 = new Date(2026, 9, 29, 12, 0, 0); // 昨天
    const day3 = new Date(2026, 9, 30, 12, 0, 0); // 今天

    // 昨天 (2026-10-29) 微信设置了 FLOW 心流状态
    const cfg = {
      packageName: 'com.tencent.mm',
      isTracked: true,
      dailyOverrides: {
        '2026-10-29': {
          mood: 'FLOW' as const,
          notes: '深度沟通中',
        },
      },
    };

    // 今天 (2026-10-30) 尚未设置状态（具体状态未知）
    const stateToday = resolveAppDailyState('com.tencent.mm', day3, cfg, []);
    // 应该自动继承前一天 (2026-10-29) 的 FLOW 状态！
    expect(stateToday.mood).toBe('FLOW');
    expect(stateToday.isMoodInheritedFromPreviousDay).toBe(true);
    expect(stateToday.inheritedFromDateKey).toBe('2026-10-29');

    // 2天前 (2026-10-28) 也未单独设置状态，前一天(27号)也无状态，应回退至默认
    const stateTwoDaysAgo = resolveAppDailyState('com.tencent.mm', day1, cfg, []);
    expect(stateTwoDaysAgo.isMoodInheritedFromPreviousDay).toBe(false);
  });
});
