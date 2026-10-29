import type { ActivityMood, AppSettings, ProjectGoal } from '../types';

export interface ParseResult {
  title: string;
  category: string;
  tags: string[];
  durationMinutes: number;
  isRealtimeStart: boolean;
  mood: ActivityMood;
  exactStartTime?: number; // Unix timestamp ms
  exactEndTime?: number;   // Unix timestamp ms
  isFuzzyTime?: boolean;   // 是否为未知时段（仅记录时长）
  projectId?: string;      // 智能匹配或标签指定的专属项目 ID
  notes?: string;
  confidence: 'RULE' | 'AI';
}

// 情绪关键词映射
const MOOD_KEYWORDS: Record<ActivityMood, string[]> = {
  FLOW: ['心流', '很爽', '沉浸', '高效', '顺手', '极佳', '超棒', '暴汗', '酣畅'],
  FOCUSED: ['专注', '攻坚', '深度', '认真', '顺利'],
  TIRED: ['好累', '疲惫', '犯困', '撑不住', '没精打采', '头疼', '困', '乏力', '缺觉'],
  DISTRACTED: ['摸鱼', '走神', '分心', '看视频', '刷手机', '发呆', '刷视频', '刷帖子', '水群', '逛论坛', '刷知乎', '刷抖音'],
  FRUSTRATED: ['改吐了', '烦', '心烦', '卡壳', '恶心', '折磨', '受挫', 'bug太多', '连跪', '掉分'],
  NORMAL: [],
};

// 常见分类推断
const CATEGORY_MAP: Record<string, string[]> = {
  '开发/技术': ['代码', 'bug', 'git', 'debug', '重构', '部署', '开发', '前端', '后端', 'api', '架构', '接口', '报错', '排查'],
  '工作/业务': ['会议', '开会', '需求', '方案', 'ppt', '沟通', '邮件', '日报', '周报', '客户', '评审', '答辩'],
  '学习/提升': ['看书', '读书', '论文', '复习', '背单词', '阅读', '网课', '教程', '研究', '公开课'],
  '健康/运动': ['跑步', '慢跑', '健身', '散步', '拉伸', '喝水', '休息', '午休', '眼保健操', '锻炼', '运动', '睡觉', '睡眠', '补觉', '骑行', '打球', '游泳', '深蹲', '瑜伽', '早睡'],
  '休闲/生活': [
    '吃饭', '摸鱼', '游戏', '看剧', '聊天', '发呆', '买东西', '外卖',
    '微信', 'qq', '水群', '开黑', '排位', '打游戏', '玩游戏', 'steam', '王者',
    '视频', '刷视频', '看视频', '抖音', 'b站', 'bilibili', '快手', '油管',
    '帖子', '刷帖', '刷帖子', '贴吧', '知乎', '微博', '小红书', '逛论坛', '刷手机'
  ],
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
  return '其他';
}

export interface ExtractedTargetDate {
  date: Date;
  matchedText: string;
}

/**
 * 从文本中提取相对或绝对日期（用于历史补齐）
 */
export function extractTargetDate(text: string, now: Date = new Date()): ExtractedTargetDate | null {
  // 1. 相对日期词：大前天, 前天, 昨天/昨晚/昨儿, 今天
  const relRegex = /(大前天|前天|昨晚|昨天|昨儿|今天|今早|今晚)/;
  const relMatch = relRegex.exec(text);
  if (relMatch) {
    const word = relMatch[1];
    const d = new Date(now);
    if (word === '大前天') {
      d.setDate(d.getDate() - 3);
    } else if (word === '前天') {
      d.setDate(d.getDate() - 2);
    } else if (word === '昨天' || word === '昨晚' || word === '昨儿') {
      d.setDate(d.getDate() - 1);
    }
    return { date: d, matchedText: relMatch[0] };
  }

  // 2. 完整日期：YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日
  const fullDateMatch = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})[日号]?/.exec(text);
  if (fullDateMatch) {
    const y = parseInt(fullDateMatch[1], 10);
    const m = parseInt(fullDateMatch[2], 10) - 1;
    const day = parseInt(fullDateMatch[3], 10);
    const target = new Date(y, m, day);
    if (!isNaN(target.getTime())) {
      return { date: target, matchedText: fullDateMatch[0] };
    }
  }

  // 3. 星期几 / 礼拜几 / 周几（如 "上周一", "周二", "星期三", "礼拜四"）
  const weekMatch = /(上周|本周|这周)?\s*(周|星期|礼拜)([一二三四五六日天七])/.exec(text);
  if (weekMatch) {
    const isLastWeek = weekMatch[1] === '上周';
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0, '七': 0,
    };
    const targetWeekday = dayMap[weekMatch[3]];
    if (targetWeekday !== undefined) {
      const curWeekday = now.getDay();
      let diff = targetWeekday - curWeekday;
      if (isLastWeek) {
        diff -= 7;
      } else if (diff > 0) {
        // 如果在周四提到“周五”，过去补录指上周五
        diff -= 7;
      }
      const d = new Date(now);
      d.setDate(d.getDate() + diff);
      return { date: d, matchedText: weekMatch[0] };
    }
  }

  // 4. 月日格式：MM月DD日, MM月DD号, MM-DD
  const monthDayMatch = /(\d{1,2})月(\d{1,2})[日号]?/.exec(text);
  if (monthDayMatch) {
    const y = now.getFullYear();
    const m = parseInt(monthDayMatch[1], 10) - 1;
    const day = parseInt(monthDayMatch[2], 10);
    const target = new Date(y, m, day);
    if (!isNaN(target.getTime())) {
      return { date: target, matchedText: monthDayMatch[0] };
    }
  }

  return null;
}

export interface ExtractedTimeRange {
  startTime: number;
  endTime: number;
  durationMinutes: number;
  matchedText: string;
}

export function extractTimeRange(text: string, baseDate?: Date): ExtractedTimeRange | null {
  const targetDateInfo = baseDate ? { date: baseDate, matchedText: '' } : extractTargetDate(text);
  const refDate = targetDateInfo ? targetDateInfo.date : new Date();
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const d = refDate.getDate();

  // 1. 24小时制时间段匹配：例如 "14:00到15:30", "09:30-11:00", "14:00至16:30", "14:00~15:30"
  const colonMatch = /(\d{1,2})[:：](\d{2})\s*(?:到|至|[-~—])\s*(\d{1,2})[:：](\d{2})/.exec(text);
  if (colonMatch) {
    const sH = parseInt(colonMatch[1], 10);
    const sM = parseInt(colonMatch[2], 10);
    const eH = parseInt(colonMatch[3], 10);
    const eM = parseInt(colonMatch[4], 10);

    if (sH >= 0 && sH < 24 && sM >= 0 && sM < 60 && eH >= 0 && eH < 24 && eM >= 0 && eM < 60) {
      const start = new Date(y, m, d, sH, sM, 0, 0).getTime();
      const end = new Date(y, m, d, eH, eM, 0, 0).getTime();
      if (end > start) {
        return {
          startTime: start,
          endTime: end,
          durationMinutes: Math.round((end - start) / 60000),
          matchedText: colonMatch[0],
        };
      }
    }
  }

  // 2. 中文钟点时间段匹配：例如 "从下午2点到3点半", "10点到11点", "上午9点半至11点"
  const chineseMatch =
    /(?:从|由)?\s*(上午|下午|中午|早上|晚上)?\s*(\d{1,2})\s*(?:点|时)\s*(半|\d{1,2}分)?\s*(?:到|至|[-~—])\s*(下午|中午|晚上)?\s*(\d{1,2})\s*(?:点|时)\s*(半|\d{1,2}分)?/.exec(
      text
    );
  if (chineseMatch) {
    const sPeriod = chineseMatch[1] || '';
    let sH = parseInt(chineseMatch[2], 10);
    let sM = 0;
    if (chineseMatch[3] === '半') sM = 30;
    else if (chineseMatch[3]) sM = parseInt(chineseMatch[3].replace('分', ''), 10) || 0;

    const ePeriod = chineseMatch[4] || '';
    let eH = parseInt(chineseMatch[5], 10);
    let eM = 0;
    if (chineseMatch[6] === '半') eM = 30;
    else if (chineseMatch[6]) eM = parseInt(chineseMatch[6].replace('分', ''), 10) || 0;

    if ((sPeriod === '下午' || sPeriod === '晚上') && sH < 12) sH += 12;
    if ((ePeriod === '下午' || ePeriod === '晚上' || sH >= 12) && eH < 12) eH += 12;

    if (sH >= 0 && sH < 24 && sM >= 0 && sM < 60 && eH >= 0 && eH < 24 && eM >= 0 && eM < 60) {
      const start = new Date(y, m, d, sH, sM, 0, 0).getTime();
      const end = new Date(y, m, d, eH, eM, 0, 0).getTime();
      if (end > start) {
        return {
          startTime: start,
          endTime: end,
          durationMinutes: Math.round((end - start) / 60000),
          matchedText: chineseMatch[0],
        };
      }
    }
  }

  return null;
}

/**
 * 从文本中提取 #标签，并智能匹配专属项目
 */
export function matchProjectFromText(text: string, projects: ProjectGoal[] = []): { projectId?: string; matchedProject?: ProjectGoal; extractedTags: string[]; textWithoutHashtags: string } {
  const activeProjects = projects.filter((p) => !p.isArchived);
  const lower = text.toLowerCase();

  // 1. 提取所有形如 #标签 的内容
  const hashtagRegex = /#([\w\u4e00-\u9fa5-]+)/g;
  const extractedTags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = hashtagRegex.exec(text)) !== null) {
    extractedTags.push(match[1]);
  }

  // 2. 优先通过 #标签 匹配项目名或关键词
  let matchedProject: ProjectGoal | undefined;
  for (const tag of extractedTags) {
    const tagLower = tag.toLowerCase();
    matchedProject = activeProjects.find(
      (p) => p.name.toLowerCase() === tagLower || p.keywords.some((k) => k.toLowerCase() === tagLower)
    );
    if (matchedProject) break;
  }

  // 3. 若无匹配，通过全文本中的关键词或项目名模糊匹配
  if (!matchedProject) {
    matchedProject = activeProjects.find((p) => {
      if (lower.includes(p.name.toLowerCase())) return true;
      return p.keywords.some((k) => k.trim() && lower.includes(k.toLowerCase()));
    });
  }

  const textWithoutHashtags = text.replace(/#([\w\u4e00-\u9fa5-]+)/g, '').trim();

  return {
    projectId: matchedProject?.id,
    matchedProject,
    extractedTags,
    textWithoutHashtags,
  };
}

export function parseWithRules(input: string, projects: ProjectGoal[] = []): ParseResult {
  const { projectId, matchedProject, extractedTags, textWithoutHashtags } = matchProjectFromText(input, projects);
  const text = textWithoutHashtags || input.trim();
  const mood = inferMood(text);
  const category = (matchedProject && matchedProject.category) ? matchedProject.category : inferCategory(text);

  const targetDateInfo = extractTargetDate(text);

  const baseTags = [category.split('/')[0], ...extractedTags];
  const uniqueTags = Array.from(new Set(baseTags));

  // 优先匹配明确起止时间段（如 "14:00到15:30开需求会" 或 "下午2点到3点半改PPT" 或 "昨天 14:00-16:00 开会"）
  const timeRange = extractTimeRange(text, targetDateInfo?.date);
  if (timeRange) {
    let cleanTitle = text
      .replace(timeRange.matchedText, '')
      .replace(targetDateInfo ? targetDateInfo.matchedText : '', '')
      .replace(/^(补齐|补录|补记|记一下|记录|刚刚|刚才|从|由|今天下午|今天上午|下午|上午|中午|晚上)\s*/g, '')
      .replace(/(有点烦|很爽|改吐了|好累|特别顺)/g, '')
      .trim();

    if (!cleanTitle) cleanTitle = text;

    return {
      title: cleanTitle,
      category,
      tags: uniqueTags,
      durationMinutes: timeRange.durationMinutes,
      isRealtimeStart: false,
      mood,
      exactStartTime: timeRange.startTime,
      exactEndTime: timeRange.endTime,
      projectId,
      confidence: 'RULE',
    };
  }

  // 判断是否为实时启动任务（注意：如果指定了过去日期，如“昨天开始写代码”，这属于过去补录，不是实时专注）
  const startMatch = /^(开始|准备|正在|去)\s*(.+)/i.exec(text);
  if (startMatch && !targetDateInfo) {
    const title = startMatch[2].trim();
    return {
      title: title || text,
      category,
      tags: uniqueTags,
      durationMinutes: 0,
      isRealtimeStart: true,
      mood,
      projectId,
      confidence: 'RULE',
    };
  }

  // 匹配时长，如 "刚刚花了40分钟/半小时/1.5小时" 或 "昨天花了2小时"
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

  // 提取核心事件描述：去除时间词、时态动词、补齐前缀
  let cleanTitle = text
    .replace(targetDateInfo ? targetDateInfo.matchedText : '', '')
    .replace(/^(补齐|补录|补记|记一下|记录|刚刚|刚才|今天下午|今天上午|中午|晚上|下午|上午|早上)\s*/g, '')
    .replace(/(?:花[了过]|用[了过]|大概|约)?\s*\d+(?:\.\d+)?\s*(小时|分钟|min|h)/gi, '')
    .replace(/(半小时|半个钟|一小时)/g, '')
    .replace(/(有点烦|很爽|改吐了|好累|特别顺)/g, '')
    .trim();

  if (!cleanTitle) {
    cleanTitle = text;
  }

  // 如果指定了过去目标日期（即使没有指定具体钟点），为该活动生成过去日期的具体起止时间戳
  let exactStartTime: number | undefined;
  let exactEndTime: number | undefined;
  let isFuzzyTime: boolean | undefined;

  if (targetDateInfo) {
    const target = new Date(targetDateInfo.date);
    let targetHour = 14; // 默认下午2点
    if (text.includes('晚上') || text.includes('昨晚')) {
      targetHour = 19;
    } else if (text.includes('上午') || text.includes('早上') || text.includes('今早')) {
      targetHour = 10;
    } else if (text.includes('中午')) {
      targetHour = 12;
    }
    target.setHours(targetHour, 0, 0, 0);
    exactStartTime = target.getTime();
    exactEndTime = exactStartTime + duration * 60 * 1000;
    isFuzzyTime = true;
  }

  return {
    title: cleanTitle,
    category,
    tags: uniqueTags,
    durationMinutes: duration,
    isRealtimeStart: false,
    mood,
    exactStartTime,
    exactEndTime,
    isFuzzyTime,
    projectId,
    confidence: 'RULE',
  };
}

export async function parseWithAI(
  input: string,
  settings: AppSettings,
  projects: ProjectGoal[] = []
): Promise<ParseResult> {
  // 默认使用本地极速规则（0 Token 消耗）；仅当用户主动在设置中开启 AI 随手记且填了 Key 时才请求
  if (!settings.enableAIQuickParse || !settings.apiKey || !settings.apiBaseUrl) {
    return parseWithRules(input, projects);
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
    const { projectId: matchedProjId } = matchProjectFromText(input, projects);
    return {
      title: parsed.title || input,
      category: parsed.category || inferCategory(input),
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['日常'],
      durationMinutes: Number(parsed.durationMinutes) || 30,
      isRealtimeStart: Boolean(parsed.isRealtimeStart),
      mood: (parsed.mood as ActivityMood) || inferMood(input),
      projectId: matchedProjId,
      confidence: 'AI',
    };
  } catch (err) {
    console.warn('Fast AI parse fallback to rules:', err);
    return parseWithRules(input, projects);
  }
}
