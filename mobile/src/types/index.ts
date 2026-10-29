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

export interface Activity {
  id: string;
  rawInput: string;
  title: string;
  category: string;
  tags: string[];
  startTime: number; // Unix timestamp (ms)
  endTime: number | null; // null if currently ongoing
  durationMinutes: number;
  status: ActivityStatus;
  mood: ActivityMood;
  notes?: string;
  isFuzzyTime?: boolean; // 是否为未知时段（仅记录时长）
  projectId?: string; // 关联的专属项目/目标 ID
  isAutoDetected?: boolean; // 📱 手机端：是否为自动感知的 App 时间块
  sourceAppPackage?: string; // 📱 手机端：来源包名
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
  title?: string;
  mood?: ActivityMood;
  notes?: string;
  isFuzzyTime?: boolean;
  projectId?: string;
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
};

// 📱 手机端专用：用户自定义的应用配置（别名、分类、备注与追踪开关）
export interface TrackedAppConfig {
  packageName: string;
  customName?: string;     // 用户自定义别名（改名字，替代 com.xxx）
  category?: string;       // 用户自定义分类
  notes?: string;          // 用户备注/说明
  isTracked: boolean;      // 是否选定追踪该应用
  updatedAt?: number;
}

// 📱 手机端专用：原生 UsageStats 提取的应用时长条目
export interface AppUsageItem {
  packageName: string;
  appName: string;
  originalAppName?: string;
  foregroundMs: number;
  lastTimeUsed: number;
  category: string;
  notes?: string;
  isTracked?: boolean;
  isImported?: boolean;
}

// 📱 手机端专用：Android 原生注入对象 window.ChronosNative 契约
export interface ChronosNativeInterface {
  getSafeAreaInsets?(): string;
  hasUsagePermission(): boolean;
  openUsageSettings(): void;
  getAppUsageJson(startTime: number, endTime: number): string;
  vibrate(durationMs?: number): void;
  showToast(message: string): void;
}

declare global {
  interface Window {
    ChronosNative?: ChronosNativeInterface;
  }
}
