import { describe, it, expect } from 'vitest';
import { calculateAppPower, calculateTotalPower } from '../src/lib/powerUtils';

describe('powerUtils - 自适应应用能耗估算模型测试', () => {
  it('应准确推断 3D 重载游戏的耗电量与极重能耗评级', () => {
    // 1 小时 原神
    const oneHourMs = 3600 * 1000;
    const result = calculateAppPower({
      foregroundMs: oneHourMs,
      appName: '原神',
      packageName: 'com.miHoYo.Yuanshen',
      category: '休闲/娱乐',
      batteryCapacityMah: 5000,
    });

    expect(result.level).toBe('EXTREME');
    expect(result.levelLabel).toBe('重度耗电');
    expect(result.mah).toBe(540); // 540 mA * 1h
    expect(result.percent).toBe(10.8); // 540 / 5000 = 10.8%
    expect(result.hourlyRateMah).toBe(540);
    expect(result.breakdown).toContain('GPU');
  });

  it('应准确推断视频流媒体的高耗电量与较高能耗评级', () => {
    // 2 小时 哔哩哔哩
    const twoHoursMs = 2 * 3600 * 1000;
    const result = calculateAppPower({
      foregroundMs: twoHoursMs,
      appName: '哔哩哔哩',
      packageName: 'tv.danmaku.bili',
      category: '休闲/娱乐',
      batteryCapacityMah: 5000,
    });

    expect(result.level).toBe('HIGH');
    expect(result.levelLabel).toBe('较高耗电');
    expect(result.mah).toBe(720); // 360 * 2 = 720
    expect(result.percent).toBe(14.4); // 720 / 5000 = 14.4%
    expect(result.breakdown).toContain('视频解码');
  });

  it('应准确推断微信等社交通讯的中等能耗', () => {
    // 30 分钟 微信
    const halfHourMs = 1800 * 1000;
    const result = calculateAppPower({
      foregroundMs: halfHourMs,
      appName: '微信',
      packageName: 'com.tencent.mm',
      category: '社交/沟通',
      batteryCapacityMah: 5000,
    });

    expect(result.level).toBe('MEDIUM');
    expect(result.levelLabel).toBe('中等能耗');
    expect(result.mah).toBe(120); // 240 * 0.5 = 120
    expect(result.percent).toBe(2.4);
  });

  it('应准确推断纯文字阅读与工具的轻量低能耗', () => {
    // 1 小时 微信读书
    const oneHourMs = 3600 * 1000;
    const result = calculateAppPower({
      foregroundMs: oneHourMs,
      appName: '微信读书',
      packageName: 'com.tencent.weread',
      category: '学习/提升',
      batteryCapacityMah: 5000,
    });

    expect(result.level).toBe('LOW');
    expect(result.levelLabel).toBe('轻量省电');
    expect(result.mah).toBe(140); // 140 * 1h
    expect(result.percent).toBe(2.8);
  });

  it('极端边界值测试: 0毫秒与短时长测试', () => {
    const zero = calculateAppPower({
      foregroundMs: 0,
      appName: '任意App',
    });
    expect(zero.mah).toBe(0);
    expect(zero.percent).toBe(0);

    // 40 秒，应保证计算出有效毫安时
    const shortTime = calculateAppPower({
      foregroundMs: 40 * 1000,
      appName: '任意App',
    });
    expect(shortTime.mah).toBeGreaterThanOrEqual(1);
    expect(shortTime.percent).toBeGreaterThan(0);
  });

  it('calculateTotalPower 应能准确汇总多个应用的总能耗', () => {
    const apps = [
      { foregroundMs: 3600 * 1000, appName: '原神', packageName: 'com.miHoYo.Yuanshen' }, // 540 mAh
      { foregroundMs: 1800 * 1000, appName: '微信', packageName: 'com.tencent.mm' },      // 120 mAh
      { foregroundMs: 3600 * 1000, appName: '微信读书', packageName: 'com.tencent.weread' }, // 140 mAh
    ];

    const total = calculateTotalPower(apps, 5000);
    expect(total.totalMah).toBe(540 + 120 + 140); // 800 mAh
    expect(total.totalPercent).toBe(16.0); // 800 / 5000 = 16%
  });
});
