/**
 * 应用能耗与耗电量动态计算模型 (Adaptive App Power Model)
 * 纯本地自适应硬件放电建模，0 门槛开箱即用，无需 ADB 或 Root 权限。
 * 基于前台精准活跃时长 + 业务负载属性 + 设备电池基准容量科学估算。
 */

export type PowerConsumptionLevel = 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AppPowerEstimate {
  /** 预估或实测总耗电量 (mAh) */
  mah: number;
  /** 占设备全天电池总容量百分比 (%) */
  percent: number;
  /** 平均每小时放电速率 (mAh/h) */
  hourlyRateMah: number;
  /** 平均每小时放电百分比 (%/h) */
  hourlyRatePercent: number;
  /** 是否为 ADB 系统内核真实测量数据 */
  isHardwareMeasured: boolean;
  /** 数据来源与准确度详细说明 */
  accuracyNotice: string;
  /** 能耗烈度评级 */
  level: PowerConsumptionLevel;
  /** 评级文案 */
  levelLabel: string;
  /** 评级主题色 */
  levelColor: string;
  /** 徽章背景色 CSS 类 */
  badgeBg: string;
  /** 徽章边框色 CSS 类 */
  badgeBorder: string;
  /** 徽章文字色 CSS 类 */
  badgeText: string;
  /** 典型能耗成因分析说明 */
  breakdown: string;
}

interface PowerProfile {
  rateMa: number;
  level: PowerConsumptionLevel;
  label: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  breakdown: string;
}

// 常见高耗电游戏与 3D 渲染应用包名特征
const GAME_KEYWORDS = [
  'game',
  'mihoyo',
  'tmgp',
  'netease',
  'hypergryph',
  'kurogame',
  'biligame',
  'blizzard',
  'epic',
  'unity',
  'unreal',
];

const GAME_NAMES = [
  '原神',
  '王者荣耀',
  '王者',
  '崩坏',
  '和平精英',
  '吃鸡',
  '三国',
  '阴阳师',
  '明日方舟',
  '鸣潮',
  '绝区零',
  '火影',
  '英雄联盟',
  '金铲铲',
  '使命召唤',
  '极品飞车',
  '穿越火线',
  '第五人格',
  '暗区突围',
  '重返未来',
  '游戏',
];

// 常见高刷视频与相机流媒体应用
const VIDEO_KEYWORDS = [
  'aweme',
  'kuaishou',
  'bilibili',
  'bili',
  'youku',
  'iqiyi',
  'qqlive',
  'douyu',
  'huya',
  'youtube',
  'netflix',
  'camera',
  'video',
  'livestream',
  'tiktok',
];

const VIDEO_NAMES = [
  '抖音',
  '快手',
  '哔哩哔哩',
  'b站',
  '爱奇艺',
  '优酷',
  '腾讯视频',
  '芒果',
  '虎牙',
  '斗鱼',
  '相机',
  '剪映',
  '视频',
  '直播',
  '影音',
];

// 常见社交与聊天
const SOCIAL_NAMES = [
  '微信',
  'qq',
  '微博',
  '小红书',
  '知乎',
  '钉钉',
  '飞书',
  '企业微信',
  '贴吧',
  '即刻',
  '社交',
  '沟通',
  '推特',
  'twitter',
  'telegram',
  'discord',
];

// 常见纯文字、极简阅读与工具应用
const READING_NAMES = [
  '微信读书',
  '阅读',
  '书',
  '备忘录',
  '便签',
  '计算器',
  '时钟',
  '日历',
  '设置',
  '待办',
  '记账',
  '工具',
  '天气',
  '词典',
];

/**
 * 智能识别应用的能耗画像
 */
function resolvePowerProfile(
  appName: string = '',
  packageName: string = '',
  category: string = ''
): PowerProfile {
  const lowerName = appName.toLowerCase();
  const lowerPkg = packageName.toLowerCase();
  const lowerCat = category.toLowerCase();

  // 1. 3D 大型游戏 / 高负载渲染 (最高能耗 ~540 mA)
  const isGame =
    GAME_KEYWORDS.some((kw) => lowerPkg.includes(kw)) ||
    GAME_NAMES.some((gn) => lowerName.includes(gn)) ||
    lowerCat.includes('游戏');

  if (isGame) {
    return {
      rateMa: 540,
      level: 'EXTREME',
      label: '重度耗电',
      color: '#f43f5e',
      badgeBg: 'bg-rose-500/15',
      badgeBorder: 'border-rose-500/30',
      badgeText: 'text-rose-400',
      breakdown: '3D GPU重载渲染 + 高帧率屏幕放电 + 芯片持续高频',
    };
  }

  // 2. 视频流媒体 / 高刷相机与直播 (~360 mA)
  const isVideo =
    VIDEO_KEYWORDS.some((kw) => lowerPkg.includes(kw)) ||
    VIDEO_NAMES.some((vn) => lowerName.includes(vn)) ||
    lowerCat.includes('影音') ||
    lowerCat.includes('视频');

  if (isVideo) {
    return {
      rateMa: 360,
      level: 'HIGH',
      label: '较高耗电',
      color: '#f59e0b',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400',
      breakdown: '屏幕持续高刷常亮 + 硬件视频解码 + 网络流持续拉取',
    };
  }

  // 3. 纯文字阅读 / 极简系统工具 (~140 mA) - 优先于社交以准确识别微信读书等阅读产品
  const isReadingOrTool =
    READING_NAMES.some((rn) => lowerName.includes(rn)) ||
    lowerPkg.includes('weread') ||
    lowerPkg.includes('reader') ||
    lowerCat.includes('工具') ||
    lowerCat.includes('日常') ||
    lowerCat.includes('阅读');

  if (isReadingOrTool) {
    return {
      rateMa: 140,
      level: 'LOW',
      label: '轻量省电',
      color: '#10b981',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeText: 'text-emerald-400',
      breakdown: '低渲染静态屏幕 + 极低芯片负荷 + 节能省电',
    };
  }

  // 4. 社交聊天 / 图文信息流 (~240 mA)
  const isSocial =
    SOCIAL_NAMES.some((sn) => lowerName.includes(sn)) ||
    lowerPkg.includes('tencent.mm') ||
    lowerPkg.includes('mobileqq') ||
    lowerPkg.includes('sina.weibo') ||
    lowerPkg.includes('xhs') ||
    lowerCat.includes('社交') ||
    lowerCat.includes('沟通');

  if (isSocial) {
    return {
      rateMa: 240,
      level: 'MEDIUM',
      label: '中等能耗',
      color: '#818cf8',
      badgeBg: 'bg-indigo-500/15',
      badgeBorder: 'border-indigo-500/30',
      badgeText: 'text-indigo-300',
      breakdown: '交互式屏幕放电 + 频繁网络握手 + 后台消息通道活跃',
    };
  }

  // 5. 工作 / 学习 / 默认通用应用 (~200 mA)
  return {
    rateMa: 200,
    level: 'MEDIUM',
    label: '中等能耗',
    color: '#38bdf8',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    breakdown: '标准前台交互屏幕放电与通用计算能耗',
  };
}

/**
 * 计算单个应用的预估耗电量
 * @param options.foregroundMs 前台活跃使用时长 (毫秒)
 * @param options.appName 应用名称
 * @param options.packageName 应用包名
 * @param options.category 应用分类
 * @param options.batteryCapacityMah 设备基准电池容量 (默认 5000 mAh)
 */
export function calculateAppPower(options: {
  foregroundMs: number;
  appName?: string;
  packageName?: string;
  category?: string;
  batteryCapacityMah?: number;
  hardwareMah?: number;
}): AppPowerEstimate {
  const {
    foregroundMs,
    appName = '',
    packageName = '',
    category = '',
    batteryCapacityMah = 5000,
    hardwareMah,
  } = options;

  const validCapacity = batteryCapacityMah > 1000 ? batteryCapacityMah : 5000;
  const profile = resolvePowerProfile(appName, packageName, category);

  // 毫秒转小时 (保留小数)
  const hours = Math.max(0, foregroundMs) / (3600 * 1000);

  // 计算消耗电量 mAh (四舍五入)
  let mah = Math.round(hours * profile.rateMa);

  // 若有时长大于 30 秒但小于 1 分钟，保证最小展示 1 mAh（除非时间为 0）
  if (mah === 0 && foregroundMs >= 30 * 1000) {
    mah = 1;
  }

  // 优先采用 ADB 授权读取的系统内核真实硬件电量
  const isHardwareMeasured = typeof hardwareMah === 'number' && hardwareMah > 0;
  if (isHardwareMeasured) {
    mah = Math.round(hardwareMah);
  }

  // 占设备电池总容量百分比 (若有耗电则至少保留 0.1% 展示)
  const rawPercent = (mah / validCapacity) * 100;
  const percent =
    mah > 0
      ? Math.max(0.1, Number(rawPercent.toFixed(1)))
      : 0;

  const hourlyRateMah = profile.rateMa;
  const hourlyRatePercent = Number(
    ((profile.rateMa / validCapacity) * 100).toFixed(1)
  );

  const accuracyNotice = isHardwareMeasured
    ? '数据来源：ADB 系统内核硬件实测 (高精准度)'
    : '数据来源：自适应算法预估 (未获 ADB 授权，准确度较低)';

  return {
    mah,
    percent,
    hourlyRateMah,
    hourlyRatePercent,
    isHardwareMeasured,
    accuracyNotice,
    level: profile.level,
    levelLabel: isHardwareMeasured ? `${profile.label} · 实测` : profile.label,
    levelColor: profile.color,
    badgeBg: profile.badgeBg,
    badgeBorder: profile.badgeBorder,
    badgeText: profile.badgeText,
    breakdown: profile.breakdown,
  };
}

/**
 * 汇总一批应用的总预估耗电量
 */
export function calculateTotalPower(
  apps: Array<{
    foregroundMs: number;
    appName?: string;
    packageName?: string;
    category?: string;
    hardwareMah?: number;
  }>,
  batteryCapacityMah = 5000
): { totalMah: number; totalPercent: number; hasHardwareStats: boolean } {
  let totalMah = 0;
  let hasHardwareStats = false;
  for (const app of apps) {
    if (typeof app.hardwareMah === 'number' && app.hardwareMah > 0) {
      hasHardwareStats = true;
    }
    const est = calculateAppPower({
      foregroundMs: app.foregroundMs,
      appName: app.appName,
      packageName: app.packageName,
      category: app.category,
      batteryCapacityMah,
      hardwareMah: app.hardwareMah,
    });
    totalMah += est.mah;
  }
  const validCapacity = batteryCapacityMah > 1000 ? batteryCapacityMah : 5000;
  const rawTotalPercent = (totalMah / validCapacity) * 100;
  const totalPercent =
    totalMah > 0
      ? Math.max(0.1, Number(rawTotalPercent.toFixed(1)))
      : 0;

  return { totalMah, totalPercent, hasHardwareStats };
}
