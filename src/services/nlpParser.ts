import type { ActivityMood, AppSettings } from '../types';

export interface ParseResult {
  title: string;
  category: string;
  tags: string[];
  durationMinutes: number;
  isRealtimeStart: boolean;
  mood: ActivityMood;
  notes?: string;
  confidence: 'RULE' | 'AI';
}

// 情绪关键词映射
const MOOD_KEYWORDS: Record<ActivityMood, string[]> = {
  FLOW: ['心流', '很爽', '沉浸', '高效', '顺手', '极佳', '超棒'],
  FOCUSED: ['专注', '攻坚', '深度', '认真', '顺利'],
  TIRED: ['好累', '疲惫', '犯困', '撑不住', '没精打采', '头疼'],
  DISTRACTED: ['摸鱼', '走神', '分心', '看视频', '刷手机', '发呆'],
  FRUSTRATED: ['改吐了', '烦', '心烦', '卡壳', '恶心', '折磨', '受挫', 'bug太多'],
  NORMAL: [],
};

// 常见分类推断
const CATEGORY_MAP: Record<string, string[]> = {
  '开发/技术': ['代码', 'bug', 'git', 'debug', '重构', '部署', '开发', '前端', '后端', 'api', '架构', '接口', '报错', '排查'],
  '工作/业务': ['会议', '开会', '需求', '方案', 'ppt', '沟通', '邮件', '日报', '周报', '客户', '评审'],
  '学习/提升': ['看书', '读书', '论文', '复习', '背单词', '阅读', '网课', '教程', '研究'],
  '健康/运动': ['跑步', '健身', '散步', '拉伸', '喝水', '休息', '午休', '眼保健操'],
  '休闲/生活': ['吃饭', '摸鱼', '游戏', '看剧', '聊天', '发呆', '买东西', '外卖'],
};

export function inferMood(text: string): ActivityMood {
  const lower = text.toLowerCase();
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return mood as ActivityMood;
    }
  }
  return 'NORMAL';
}

export function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => lower.includes(k))) {
      return cat;
    }
  }
  return '其他工作';
}

export function parseWithRules(input: string): ParseResult {
  const text = input.trim();
  const mood = inferMood(text);
  const category = inferCategory(text);

  // 判断是否为实时启动任务（如 "开始写代码", "准备看书"）
  const startMatch = /^(开始|准备|正在|去)\s*(.+)/i.exec(text);
  if (startMatch) {
    const title = startMatch[2].trim();
    return {
      title: title || text,
      category,
      tags: [category.split('/')[0]],
      durationMinutes: 0,
      isRealtimeStart: true,
      mood,
      confidence: 'RULE',
    };
  }

  // 匹配时长，如 "刚刚花了40分钟/半小时/1.5小时"
  let duration = 30; // 默认30分钟
  const durationMatch =
    /(?:花[了过]|用[了过]|大概|约|持续)?\s*(\d+(?:\.\d+)?)\s*(小时|分钟|min|h)/i.exec(text);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('h') || unit.includes('小时')) {
      duration = Math.round(val * 60);
    } else {
      duration = Math.round(val);
    }
  } else if (text.includes('半小时') || text.includes('半个钟')) {
    duration = 30;
  } else if (text.includes('一小时') || text.includes('1小时')) {
    duration = 60;
  }

  // 提取核心事件描述：去除时间词、时态动词
  let cleanTitle = text
    .replace(/^(刚刚|刚才|今天下午|今天上午|中午|晚上)\s*/, '')
    .replace(/(?:花[了过]|用[了过]|大概|约)?\s*\d+(?:\.\d+)?\s*(小时|分钟|min|h)/gi, '')
    .replace(/(半小时|半个钟|一小时)/g, '')
    .replace(/(有点烦|很爽|改吐了|好累|特别顺)/g, '')
    .trim();

  if (!cleanTitle) {
    cleanTitle = text;
  }

  return {
    title: cleanTitle,
    category,
    tags: [category.split('/')[0]],
    durationMinutes: duration,
    isRealtimeStart: false,
    mood,
    confidence: 'RULE',
  };
}

export async function parseWithAI(
  input: string,
  settings: AppSettings
): Promise<ParseResult> {
  // 如果没有配置 API Key，直接使用本地规则保底
  if (!settings.apiKey || !settings.apiBaseUrl) {
    return parseWithRules(input);
  }

  const systemPrompt = `你是一个精准的桌面时间管理语义解析引擎。分析用户的随手记文本，返回严格合法的单行 JSON 格式：
{
  "title": "精简动作与任务名（不超过15字）",
  "category": "分类（开发/技术、工作/业务、学习/提升、健康/运动、休闲/生活、其他）",
  "tags": ["标签1", "标签2"],
  "durationMinutes": 预估或提取的时长(分钟数数字，如果是开始某事则填0),
  "isRealtimeStart": true或false(如果是准备开始做/正在做填true，事后记录填false),
  "mood": "FLOW|FOCUSED|TIRED|DISTRACTED|FRUSTRATED|NORMAL"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s 超时降级

    const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.fastModel || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('AI API failed with status:', response.status);
      return parseWithRules(input);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return parseWithRules(input);

    const parsed = JSON.parse(content);
    return {
      title: parsed.title || input,
      category: parsed.category || inferCategory(input),
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['日常'],
      durationMinutes: Number(parsed.durationMinutes) || 30,
      isRealtimeStart: Boolean(parsed.isRealtimeStart),
      mood: (parsed.mood as ActivityMood) || inferMood(input),
      confidence: 'AI',
    };
  } catch (err) {
    console.warn('Fast AI parse fallback to rules:', err);
    return parseWithRules(input);
  }
}
