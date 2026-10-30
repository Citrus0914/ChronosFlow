import { formatDate, isSameDay } from '../lib/dateUtils';

export type ActivityStatus = 'IN_PROGRESS' | 'COMPLETED';

export type ActivityMood = 'FLOW' | 'FOCUSED' | 'TIRED' | 'DISTRACTED' | 'FRUSTRATED' | 'NORMAL';

/**
 * 🌟 统一标准分类库（Single Source of Truth）
 * 彻底对齐：
 * 1. 手动时补齐 / 编辑弹窗 (MobileManualModal)
 * 2. 应用详情与自定义配置 (AppDetailModal)
 * 3. 手机底层应用自动感知预设 (nativeBridge)
 * 4. 自然语言 NLP 智能语义推断 (nlpParser)
 */
export const STANDARD_CATEGORIES = [
  '工作/业务',
  '开发/技术',
  '学习/提升',
  '社交/沟通',
  '休闲/娱乐',
  '健康/运动',
  '生活/日常',
  '创作/灵感',
  '休息/睡眠',
  '默认/其他',
] as const;

export type StandardCategory = (typeof STANDARD_CATEGORIES)[number];

export const CATEGORY_ALIAS_MAP: Record<string, string> = {
  '休闲娱乐': '休闲/娱乐',
  '休闲/生活': '休闲/娱乐',
  '娱乐/休闲': '休闲/娱乐',
  '娱乐': '休闲/娱乐',
  '沟通协作': '社交/沟通',
  '社交': '社交/沟通',
  '学习/阅读': '学习/提升',
  '阅读/学习': '学习/提升',
  '开发/工作': '开发/技术',
  '健康/生活': '健康/运动',
  '日常/生活': '生活/日常',
  '其他工作': '工作/业务',
  '其他': '默认/其他',
  '默认': '默认/其他',
};

/**
 * 🌟 统一分类归一化函数：彻底消除无斜杠别名与旧版分类别称（如“休闲娱乐”统一为“休闲/娱乐”）
 */
export function normalizeCategory(category?: string): string {
  if (!category) return '默认/其他';
  const trimmed = category.trim();
  return CATEGORY_ALIAS_MAP[trimmed] || trimmed || '默认/其他';
}

export interface Activity {
  id: string;
  rawInput: string;
  title: string;
  category: string; // 保持兼容：主分类（多分类时的首项）
  categories?: string[]; // 🌟 同一项记录可同时隶属于多个分类
  tags: string[];
  startTime: number; // Unix timestamp (ms)
  endTime: number | null; // null if currently ongoing
  durationMinutes: number;
  status: ActivityStatus;
  mood: ActivityMood;
  notes?: string;
  isFuzzyTime?: boolean; // 是否为未知时段（仅记录时长）
  projectId?: string; // 关联的主专属项目/目标 ID
  projectIds?: string[]; // 关联的多个专属项目/目标 ID 列表
  isAutoDetected?: boolean; // 📱 手机端：是否为自动感知的 App 时间块
  sourceAppPackage?: string; // 📱 手机端：来源包名
}

/**
 * 获取活动记录的所有有效隶属分类列表（兼顾单分类与多分类向后兼容，且严格归一化消除重名）
 */
export function getActivityCategories(item?: { category?: string; categories?: string[] }): string[] {
  if (!item) return ['默认/其他'];
  if (Array.isArray(item.categories) && item.categories.length > 0) {
    const valid = Array.from(
      new Set(item.categories.map((c) => normalizeCategory(c)).filter(Boolean))
    );
    if (valid.length > 0) return valid;
  }
  if (item.category && item.category.trim()) {
    return [normalizeCategory(item.category)];
  }
  return ['默认/其他'];
}

export interface CategoryStat {
  category: string;
  minutes: number;
  percentage: number;
  color: string;
}

export interface AICoachDebrief {
  overview: string;
  deepWorkDuration: string;
  contextSwitchEvaluation: string;
  frictionPoints: string[];
  recommendations: string[];
  energyCurveNote: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  deepWorkMinutes: number;
  activitiesCount: number;
  categoryStats: CategoryStat[];
  debrief?: AICoachDebrief;
}

export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  fastModel: string;
  deepModel: string;
  hotkey: string;
  enableSmartGapAlert: boolean;
  enableAIQuickParse: boolean;
  theme: 'dark' | 'light' | 'system';
  enableAutoAppUsageSync?: boolean;
  minUsageDurationSeconds?: number;
  enableBatteryTracking?: boolean; // 🌟 是否开启应用耗电量感知与评估
}

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  message: string;
}

export interface ManualPrefill {
  id?: string;          // 目标编辑记录 ID（若传入则为编辑模式，否则为新增模式）
  defaultDate?: string; // YYYY-MM-DD
  startTime?: number;   // ms timestamp
  endTime?: number;     // ms timestamp
  durationMinutes?: number;
  category?: string;
  categories?: string[]; // 🌟 支持多分类回显
  title?: string;
  mood?: ActivityMood;
  notes?: string;
  isFuzzyTime?: boolean;
  projectId?: string;
  projectIds?: string[];
}

export type BudgetType = 'AT_LEAST' | 'AT_MOST';

export interface CategoryBudget {
  category: string;
  weeklyTargetHours: number;
  budgetType: BudgetType;
  isEnabled: boolean;
}

export interface ProjectGoal {
  id: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
  keywords: string[];
  targetHours: number;
  period: 'WEEKLY' | 'TOTAL';
  budgetType: BudgetType;
  createdAt: number;
  isArchived: boolean;
}

export type PaceStatus = 'COMPLETED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'EXCEEDED' | 'WARNING' | 'HEALTHY';

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  fastModel: 'deepseek-chat',
  deepModel: 'deepseek-reasoner',
  hotkey: 'Alt+Space',
  enableSmartGapAlert: true,
  enableAIQuickParse: false,
  theme: 'dark',
  enableAutoAppUsageSync: true,
  minUsageDurationSeconds: 60,
  enableBatteryTracking: true,
};

// 📱 手机端专用：单日独立的详细信息（分类、情绪精力、备注、专属目标）
export interface AppDailyDetail {
  category?: string;
  categories?: string[];
  mood?: ActivityMood;
  notes?: string;
  projectId?: string;
  projectIds?: string[];
}

// 📱 手机端专用：用户自定义的应用配置（别名、多分类、备注、专属项目与追踪开关）
export interface TrackedAppConfig {
  packageName: string;
  customName?: string;     // 用户自定义别名（改名字，替代 com.xxx）
  cachedAppName?: string;  // 缓存的系统解析可读原名（跨天 0 分钟时展示友好名称）
  category?: string;       // 默认主分类模板
  categories?: string[];   // 默认多分类模板
  projectId?: string;      // 默认专属目标 ID
  projectIds?: string[];   // 默认多个专属目标 ID
  notes?: string;          // 默认备注模板
  isTracked: boolean;      // 是否选定追踪该应用
  updatedAt?: number;
  mood?: ActivityMood;     // 默认情绪与精力状态模板
  dailyOverrides?: Record<string, AppDailyDetail>; // 🌟 每一天独立的详细信息 (key: YYYY-MM-DD)
}

// 📱 手机端专用：原生 UsageStats 提取的应用时长条目
export interface AppUsageItem {
  packageName: string;
  appName: string;
  originalAppName?: string;
  foregroundMs: number;
  lastTimeUsed: number;
  category: string;
  categories?: string[];   // 🌟 该应用同时隶属的多个分类
  projectId?: string;      // 关联的专属目标项目 ID
  projectIds?: string[];   // 关联的多个专属目标 ID
  notes?: string;
  isTracked?: boolean;
  isImported?: boolean;    // 目标日期是否已有自动入流时间块
  importedMinutes?: number; // 目标日期已同步到时间流的分钟数
  unsyncedMinutes?: number; // 目标日期尚未同步的增量分钟数
  mood?: ActivityMood;     // 🌟 用户自定义的情绪与精力状态
  isMoodInheritedFromPreviousDay?: boolean; // 🌟 是否因当天具体状态未知而继承了前一天的状态
  inheritedFromDateKey?: string;           // 继承来源日期的 key (YYYY-MM-DD)
  hardwareMah?: number;    // 🌟 通过 ADB 授权读取的系统内核真实耗电量 (mAh)
}

export interface ResolvedDailyState {
  category: string;
  categories: string[];
  mood: ActivityMood;
  notes: string;
  projectId?: string;
  projectIds?: string[];
  isMoodInheritedFromPreviousDay: boolean;
  inheritedFromDateKey?: string;
}

/**
 * 🌟 解析指定应用在特定日期的独立详细状态（分类、情绪精力、备注、专属目标）
 * 核心设计：
 * 1. 每一天的应用使用状况的详细信息必须独立：优先采用目标日期的显式单日覆盖 (dailyOverrides[targetDateKey]) 或当天已入流的活动属性；
 * 2. 具体状态未知，就默认按前一天的状态：当天的 mood 状态若未单独设置，逐日向前回溯（前一天、前两天... 前七天）继承最近一天的状态；
 * 3. 若前序历史仍未设置，回退至全局配置模板或智能分类启发值。
 */
export function resolveAppDailyState(
  packageName: string,
  targetDate: Date,
  config?: TrackedAppConfig,
  activities: Activity[] = []
): ResolvedDailyState {
  const targetKey = formatDate(targetDate);
  const todayOverride = config?.dailyOverrides?.[targetKey];
  const sameDayAct = activities.find(
    (a) => a.isAutoDetected && a.sourceAppPackage === packageName && isSameDay(a.startTime, targetDate)
  );

  // 1. 分类与多分类解析（目标日期优先 -> 当天活动 -> 全局配置 -> 默认）
  let rawCats: string[] = [];
  if (todayOverride && (todayOverride.categories?.length || todayOverride.category)) {
    rawCats =
      todayOverride.categories && todayOverride.categories.length > 0
        ? todayOverride.categories
        : [todayOverride.category!];
  } else if (sameDayAct && (sameDayAct.categories?.length || sameDayAct.category)) {
    rawCats =
      sameDayAct.categories && sameDayAct.categories.length > 0
        ? sameDayAct.categories
        : [sameDayAct.category!];
  } else if (config?.categories && config.categories.length > 0) {
    rawCats = config.categories;
  } else if (config?.category) {
    rawCats = [config.category];
  } else {
    rawCats = ['默认/其他'];
  }
  const normalizedCats = Array.from(new Set(rawCats.map((c) => normalizeCategory(c)).filter(Boolean)));
  const primaryCat = normalizedCats[0] || '默认/其他';

  // 2. 专属项目解析（目标日期优先，若当天显式清空则直接为 undefined，不向下穿透）
  let projectIds: string[] | undefined;
  if (
    todayOverride &&
    (Object.prototype.hasOwnProperty.call(todayOverride, 'projectIds') ||
      Object.prototype.hasOwnProperty.call(todayOverride, 'projectId'))
  ) {
    projectIds =
      todayOverride.projectIds ||
      (todayOverride.projectId ? [todayOverride.projectId] : undefined);
  } else if (sameDayAct && (sameDayAct.projectIds || sameDayAct.projectId)) {
    projectIds =
      sameDayAct.projectIds || (sameDayAct.projectId ? [sameDayAct.projectId] : undefined);
  } else {
    projectIds =
      config?.projectIds || (config?.projectId ? [config.projectId] : undefined);
  }
  const projectId = projectIds?.[0];

  // 3. 备注解析（目标日期优先，若当天显式清空则为 ''，不向下穿透）
  let notes = '';
  if (todayOverride && Object.prototype.hasOwnProperty.call(todayOverride, 'notes')) {
    notes = todayOverride.notes ?? '';
  } else if (sameDayAct?.notes !== undefined) {
    notes = sameDayAct.notes;
  } else {
    notes = config?.notes || '';
  }

  // 4. 情绪与精力状态解析（核心准则：具体状态未知，就默认按前一天的状态）
  let mood: ActivityMood | undefined;
  let isMoodInheritedFromPreviousDay = false;
  let inheritedFromDateKey: string | undefined;

  if (todayOverride?.mood) {
    mood = todayOverride.mood;
  } else if (sameDayAct?.mood) {
    mood = sameDayAct.mood;
  }

  // 若当天具体状态未知，逐日向前回溯（前一天、前两天... 最多回溯 7 天）
  if (!mood) {
    for (let offset = 1; offset <= 7; offset++) {
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - offset);
      const prevKey = formatDate(prevDate);

      // 检查前一天的 dailyOverrides
      const prevOverride = config?.dailyOverrides?.[prevKey];
      if (prevOverride?.mood) {
        mood = prevOverride.mood;
        isMoodInheritedFromPreviousDay = true;
        inheritedFromDateKey = prevKey;
        break;
      }

      // 检查前一天已入流的活动
      const prevAct = activities.find(
        (a) => a.isAutoDetected && a.sourceAppPackage === packageName && isSameDay(a.startTime, prevDate)
      );
      if (prevAct?.mood) {
        mood = prevAct.mood;
        isMoodInheritedFromPreviousDay = true;
        inheritedFromDateKey = prevKey;
        break;
      }
    }
  }

  // 若前序历史仍未设置，回退至全局配置模板
  if (!mood && config?.mood) {
    mood = config.mood;
  }

  // 最终启发式兜底
  if (!mood) {
    const hasLeisure = normalizedCats.some((c) => c.includes('娱乐') || c.includes('休闲') || c.includes('生活'));
    mood = hasLeisure ? 'DISTRACTED' : 'FOCUSED';
  }

  return {
    category: primaryCat,
    categories: normalizedCats,
    mood,
    notes,
    projectId,
    projectIds,
    isMoodInheritedFromPreviousDay,
    inheritedFromDateKey,
  };
}

// 📱 手机端专用：Android 原生注入对象 window.ChronosNative 契约
export interface ChronosNativeInterface {
  getSafeAreaInsets?(): string;
  getDeviceBatteryInfo?(): string;
  hasBatteryStatsPermission?(): boolean;
  getHardwareBatteryUsageJson?(): string;
  hasUsagePermission(): boolean;
  openUsageSettings(): void;
  getAppLabel?(packageName: string): string;
  getAppUsageJson(startTime: number, endTime: number): string;
  vibrate(durationMs?: number): void;
  showToast(message: string): void;
}

declare global {
  interface Window {
    ChronosNative?: ChronosNativeInterface;
  }
}
