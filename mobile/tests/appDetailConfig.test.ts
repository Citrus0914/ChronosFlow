import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimeStore } from '../src/store/useTimeStore';
import { storage } from '../src/services/storage';

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
});
