import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimeStore } from '../src/store/useTimeStore';
import { isSameDay } from '../src/lib/dateUtils';

describe('手机端应用跟踪同步机制 (增量同步 & 跨天同步)', () => {
  const mockUsageByDate = new Map<
    string,
    Array<{ packageName: string; appName: string; foregroundMs: number; lastTimeUsed: number }>
  >();

  function dateKeyOf(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockUsageByDate.clear();

    // 模拟 Android 原生宿主 ChronosNative (按查询日期返回对应日的前台时长)
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
          if (pkg === 'tv.danmaku.bili') return '哔哩哔哩';
          return pkg;
        },
        getAppUsageJson: (start: number, _end: number) => {
          const key = dateKeyOf(start);
          const arr = mockUsageByDate.get(key) || [];
          return JSON.stringify(arr);
        },
      },
    };

    // 重置 Store 为空白初始态
    useTimeStore.setState({
      activities: [],
      activeActivity: null,
      appUsageList: [],
      hasUsagePermission: true,
      trackerDayOffset: 0,
      lastScanDateKey: '',
      trackedAppConfigs: {
        'com.tencent.mm': {
          packageName: 'com.tencent.mm',
          isTracked: true,
          category: '社交/沟通',
          categories: ['社交/沟通'],
        },
        'tv.danmaku.bili': {
          packageName: 'tv.danmaku.bili',
          isTracked: true,
          category: '休闲/娱乐',
          categories: ['休闲/娱乐'],
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).window;
  });

  it('问题1回归：同一天同步一次后，应用使用时长多次增加（含直接点同步不先点刷新）应能持续同步新时长', () => {
    const morning = new Date(2026, 9, 30, 10, 0, 0).getTime();
    vi.setSystemTime(morning);

    // 第一次扫描并同步：微信 20 分钟
    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 20 * 60 * 1000,
        lastTimeUsed: morning - 60000,
      },
    ]);

    useTimeStore.getState().scanAppUsage();
    useTimeStore.getState().importAllAppUsages();

    let acts = useTimeStore.getState().activities;
    expect(acts).toHaveLength(1);
    expect(acts[0].durationMinutes).toBe(20);

    // 第二阶段：12:30 微信涨到 45 分钟 (+25m)
    const noon = new Date(2026, 9, 30, 12, 30, 0).getTime();
    vi.setSystemTime(noon);
    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 45 * 60 * 1000,
        lastTimeUsed: noon - 30000,
      },
    ]);

    useTimeStore.getState().scanAppUsage();
    const mmNoon = useTimeStore.getState().appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    expect(mmNoon?.isImported).toBe(true);
    expect(mmNoon?.importedMinutes).toBe(20);
    expect(mmNoon?.unsyncedMinutes).toBe(25);

    useTimeStore.getState().importAllAppUsages();
    acts = useTimeStore.getState().activities;
    expect(acts).toHaveLength(1);
    expect(acts[0].durationMinutes).toBe(45);
    expect(
      useTimeStore.getState().appUsageList.find((i) => i.packageName === 'com.tencent.mm')?.unsyncedMinutes
    ).toBe(0);

    // 第三阶段：18:00 微信涨到 62 分钟 (+17m)，用户未点右上角刷新，直接点击“同步追踪项到时间流”
    const evening = new Date(2026, 9, 30, 18, 0, 0).getTime();
    vi.setSystemTime(evening);
    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 62 * 60 * 1000,
        lastTimeUsed: evening - 10000,
      },
    ]);

    useTimeStore.getState().importAllAppUsages();
    acts = useTimeStore.getState().activities;
    expect(acts).toHaveLength(1);
    expect(acts[0].durationMinutes).toBe(62);
  });

  it('问题2回归：前一天同步过后，第二天应重置为未导入状态，同步及二次增量更新绝不覆盖前一天记录', () => {
    // Day 1: 2026-10-29 21:00:00
    const day1 = new Date(2026, 9, 29, 21, 0, 0).getTime();
    vi.setSystemTime(day1);

    mockUsageByDate.set('2026-10-29', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 50 * 60 * 1000,
        lastTimeUsed: day1 - 60000,
      },
    ]);

    useTimeStore.getState().scanAppUsage();
    useTimeStore.getState().importAllAppUsages();

    expect(useTimeStore.getState().activities).toHaveLength(1);
    expect(useTimeStore.getState().activities[0].durationMinutes).toBe(50);

    // Day 2 早上 07:30:00（覆盖 UTC+8 早上 8 点前的跨天边界陷阱）
    const day2Morning = new Date(2026, 9, 30, 7, 30, 0).getTime();
    vi.setSystemTime(day2Morning);

    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 18 * 60 * 1000,
        lastTimeUsed: day2Morning - 30000,
      },
    ]);

    useTimeStore.getState().scanAppUsage();
    const mmDay2 = useTimeStore.getState().appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    // 第二天微信应当是未导入状态，而暂未打开的哔哩哔哩以 0 分钟保留在追踪列表中
    expect(mmDay2?.isImported).toBe(false);
    expect(mmDay2?.unsyncedMinutes).toBe(18);
    const biliDay2 = useTimeStore.getState().appUsageList.find((i) => i.packageName === 'tv.danmaku.bili');
    expect(biliDay2?.isTracked).toBe(true);
    expect(biliDay2?.foregroundMs).toBe(0);
    expect(biliDay2?.appName).toBe('哔哩哔哩');

    // 第二天首次同步
    useTimeStore.getState().importAllAppUsages();
    let allActs = useTimeStore.getState().activities;
    expect(allActs).toHaveLength(2);

    // 第二天下午微信涨到 40 分钟，再次同步
    const day2Afternoon = new Date(2026, 9, 30, 15, 0, 0).getTime();
    vi.setSystemTime(day2Afternoon);
    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 40 * 60 * 1000,
        lastTimeUsed: day2Afternoon - 20000,
      },
    ]);
    useTimeStore.getState().importAllAppUsages();

    allActs = useTimeStore.getState().activities;
    expect(allActs).toHaveLength(2);
    const day1Act = allActs.find((a) => isSameDay(a.startTime, new Date(2026, 9, 29)));
    const day2Act = allActs.find((a) => isSameDay(a.startTime, new Date(2026, 9, 30)));
    expect(day1Act?.durationMinutes).toBe(50);
    expect(day2Act?.durationMinutes).toBe(40);
  });

  it('回溯补同步与跨天自动复位：在第二天切换到昨日补同步睡前新增时长，跨到第三天自动回到今日', () => {
    // Day 1 (10-29) 晚上 21:00 同步了 50 分钟，睡前 23:30 实际用到了 68 分钟但未同步
    const day1 = new Date(2026, 9, 29, 21, 0, 0).getTime();
    vi.setSystemTime(day1);
    mockUsageByDate.set('2026-10-29', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 50 * 60 * 1000,
        lastTimeUsed: day1,
      },
    ]);
    useTimeStore.getState().importAllAppUsages();

    // 睡前增长到 68 分钟
    mockUsageByDate.set('2026-10-29', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 68 * 60 * 1000,
        lastTimeUsed: new Date(2026, 9, 29, 23, 50, 0).getTime(),
      },
    ]);

    // Day 2 (10-30) 中午打开，先同步了今天的 25 分钟
    const day2 = new Date(2026, 9, 30, 12, 0, 0).getTime();
    vi.setSystemTime(day2);
    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'com.tencent.mm',
        appName: '微信',
        foregroundMs: 25 * 60 * 1000,
        lastTimeUsed: day2,
      },
    ]);
    useTimeStore.getState().importAllAppUsages();

    // 用户切回“昨日” (-1)，看到昨日还有 18 分钟未同步，点击同步
    useTimeStore.getState().setTrackerDayOffset(-1);
    const mmYesterday = useTimeStore.getState().appUsageList.find((i) => i.packageName === 'com.tencent.mm');
    expect(mmYesterday?.importedMinutes).toBe(50);
    expect(mmYesterday?.unsyncedMinutes).toBe(18);

    useTimeStore.getState().importAllAppUsages();

    const acts = useTimeStore.getState().activities;
    expect(acts).toHaveLength(2);
    expect(acts.find((a) => isSameDay(a.startTime, new Date(2026, 9, 29)))?.durationMinutes).toBe(68);
    expect(acts.find((a) => isSameDay(a.startTime, new Date(2026, 9, 30)))?.durationMinutes).toBe(25);

    // 跨到 Day 3 (10-31) 唤醒扫描时，应自动从 -1 复位回 0 (今日)
    const day3 = new Date(2026, 9, 31, 9, 0, 0).getTime();
    vi.setSystemTime(day3);
    useTimeStore.getState().scanAppUsage();
    expect(useTimeStore.getState().trackerDayOffset).toBe(0);
  });

  it('边界测试：在时间流中手动删除今日自动感知块后，应用追踪状态应立即恢复为未同步', () => {
    const today = new Date(2026, 9, 30, 14, 0, 0).getTime();
    vi.setSystemTime(today);

    mockUsageByDate.set('2026-10-30', [
      {
        packageName: 'tv.danmaku.bili',
        appName: '哔哩哔哩',
        foregroundMs: 30 * 60 * 1000,
        lastTimeUsed: today - 10000,
      },
    ]);

    useTimeStore.getState().scanAppUsage();
    useTimeStore.getState().importAllAppUsages();

    const importedAct = useTimeStore.getState().activities[0];
    expect(importedAct).toBeDefined();
    expect(
      useTimeStore.getState().appUsageList.find((i) => i.packageName === 'tv.danmaku.bili')?.isImported
    ).toBe(true);

    // 删除该条记录
    useTimeStore.getState().deleteActivity(importedAct.id);

    const biliAfterDelete = useTimeStore
      .getState()
      .appUsageList.find((i) => i.packageName === 'tv.danmaku.bili');
    expect(biliAfterDelete?.isImported).toBe(false);
    expect(biliAfterDelete?.unsyncedMinutes).toBe(30);
  });
});
