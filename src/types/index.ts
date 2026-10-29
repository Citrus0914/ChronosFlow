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
  theme: 'dark' | 'light' | 'system';
}

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING';
  title: string;
  message: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  fastModel: 'deepseek-chat',
  deepModel: 'deepseek-reasoner',
  hotkey: 'Alt+Space',
  enableSmartGapAlert: true,
  theme: 'dark',
};
