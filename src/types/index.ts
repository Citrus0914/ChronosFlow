export type ActivityStatus = 'IN_PROGRESS' | 'COMPLETED';

export type ActivityMood = 'FLOW' | 'FOCUSED' | 'TIRED' | 'DISTRACTED' | 'FRUSTRATED' | 'NORMAL';

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
}

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  message: string;
}

export interface ManualPrefill {
  defaultDate?: string; // YYYY-MM-DD
  startTime?: number;   // ms timestamp
  endTime?: number;     // ms timestamp
  category?: string;
  title?: string;
  isFuzzyTime?: boolean;
  projectId?: string;
}

// 预算类型：AT_LEAST (至少投入达标型) | AT_MOST (不超过上限克制型)
export type BudgetType = 'AT_LEAST' | 'AT_MOST';

// 分类周预算
export interface CategoryBudget {
  category: string;             // 如 "开发/技术"
  weeklyTargetHours: number;    // 周目标小时数 (如 20)
  budgetType: BudgetType;       // 至少投入 / 不超过
  isEnabled: boolean;           // 是否启用
}

// 专属项目/目标
export interface ProjectGoal {
  id: string;                   // 唯一标识 (UUID)
  name: string;                 // 项目名称 (如 "ChronosFlow开发")
  color: string;                // 专属主题色 (如 "#6366f1")
  description?: string;         // 目标描述
  category?: string;            // 归属的基础分类 (可选，专属项目属于单独额外的独立项目)
  keywords: string[];           // 自动关联触发词 (如 ["chronos", "时流", "代码"])
  targetHours: number;          // 目标时长 (小时)
  period: 'WEEKLY' | 'TOTAL';   // 周度目标 vs 总里程碑目标
  budgetType: BudgetType;       // 至少投入 / 不超过
  createdAt: number;
  isArchived: boolean;          // 是否已归档
}

// 节奏健康度状态
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
};
