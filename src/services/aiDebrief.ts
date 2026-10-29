import type { Activity, AICoachDebrief, AppSettings } from '../types';

export async function generateAICoachDebrief(
  activities: Activity[],
  settings: AppSettings
): Promise<AICoachDebrief> {
  const completed = activities.filter((a) => a.status === 'COMPLETED');
  const totalMinutes = completed.reduce((sum, a) => sum + a.durationMinutes, 0);
  const deepWorkMinutes = completed
    .filter((a) => a.durationMinutes >= 45 && (a.mood === 'FLOW' || a.mood === 'FOCUSED'))
    .reduce((sum, a) => sum + a.durationMinutes, 0);

  const contextSwitches = Math.max(0, completed.length - 1);
  const frustratedOrTired = completed.filter(
    (a) => a.mood === 'FRUSTRATED' || a.mood === 'TIRED'
  );

  // 如果没有配置 API Key，直接使用智能规则生成高水准复盘
  if (!settings.apiKey || !settings.apiBaseUrl) {
    return generateLocalDebrief(totalMinutes, deepWorkMinutes, contextSwitches, frustratedOrTired, completed);
  }

  const payload = completed.map((a) => ({
    title: a.title,
    category: a.category,
    durationMin: a.durationMinutes,
    mood: a.mood,
    rawInput: a.rawInput,
  }));

  const systemPrompt = `你是一位顶尖的认知科学与高绩效精力管理教练（类似《深度工作》与《番茄工作法》的导师）。
请分析用户今日的时间流与精力数据，给出深刻、温和且具针对性的复盘指导。
必须返回严格合法的单行 JSON 格式：
{
  "overview": "今日总体评价与精炼洞察（80-120字，指出今天最核心的价值与节奏）",
  "deepWorkDuration": "例如：2 小时 20 分钟 (占比 65%)",
  "contextSwitchEvaluation": "例如：切换较少，心流保持良好 / 任务碎片化偏高，注意多任务损耗",
  "frictionPoints": [
    "卡点或阻力1（结合情绪标签与具体事件剖析）",
    "卡点或阻力2"
  ],
  "recommendations": [
    "针对明天的可落地微建议1",
    "针对明天的可落地微建议2"
  ],
  "energyCurveNote": "对精力峰谷与时间分配的教练点评（40-60字）"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s 超时

    const response = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.deepModel || 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `今日时间记录清单（共 ${completed.length} 个任务，累计耗时 ${totalMinutes} 分钟）：\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('AI Debrief request failed:', response.status);
      return generateLocalDebrief(totalMinutes, deepWorkMinutes, contextSwitches, frustratedOrTired, completed);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return generateLocalDebrief(totalMinutes, deepWorkMinutes, contextSwitches, frustratedOrTired, completed);
    }

    const parsed = JSON.parse(content);
    return {
      overview: parsed.overview || '今日时间节奏整体平稳，关键攻坚任务已有效推进。',
      deepWorkDuration: parsed.deepWorkDuration || `${Math.round(deepWorkMinutes)} 分钟`,
      contextSwitchEvaluation: parsed.contextSwitchEvaluation || '任务切换适度。',
      frictionPoints: Array.isArray(parsed.frictionPoints) ? parsed.frictionPoints : ['部分长任务缺乏阶段性微休息。'],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['明天上午保持黄金时段攻坚，减少即时通讯打扰。'],
      energyCurveNote: parsed.energyCurveNote || '上午注意力最集中，下午需注意适度恢复精力。',
    };
  } catch (err) {
    console.warn('Fallback to local debrief:', err);
    return generateLocalDebrief(totalMinutes, deepWorkMinutes, contextSwitches, frustratedOrTired, completed);
  }
}

function generateLocalDebrief(
  totalMinutes: number,
  deepWorkMinutes: number,
  contextSwitches: number,
  frustratedList: Activity[],
  completed: Activity[]
): AICoachDebrief {
  const deepRatio = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;
  
  let switchEval = '任务切换次数适中，具备良好的工作连续性。';
  if (contextSwitches > 8) {
    switchEval = `今日共发生 ${contextSwitches} 次任务切换，注意力碎片化偏高，认知重载成本显著。`;
  } else if (contextSwitches < 3) {
    switchEval = '心流状态极佳，全天几乎没有无效的多任务打扰。';
  }

  const friction: string[] = [];
  if (frustratedList.length > 0) {
    const titles = frustratedList.map((a) => `“${a.title}”`).join('、');
    friction.push(`在 ${titles} 任务中记录了受挫或疲惫情绪，遇到了明显的思维卡点。`);
  }
  if (totalMinutes > 480) {
    friction.push('今日总工作时长已超 8 小时，晚间容易出现决策疲劳与意志力衰减。');
  }
  if (friction.length === 0) {
    friction.push('今日未出现明显负向情绪卡点，各时段衔接顺畅。');
  }

  const recs: string[] = [
    deepRatio >= 50
      ? '深度工作占比超 50%，保持当前节奏，明天尝试将最难的任务放在第一个 90 分钟块。'
      : '建议明天尝试使用“时间盒”模式，设定至少一个 45 分钟无打扰专注段。',
    '遇到调试或卡点超过 25 分钟时，强制离开屏幕散步 3 分钟，利用发散思维寻找破局点。',
  ];

  return {
    overview: `今日累计记录有效工作 ${Math.round(totalMinutes / 60)} 小时 ${totalMinutes % 60} 分钟，其中深度心流时间约 ${Math.round(deepWorkMinutes)} 分钟（占比 ${deepRatio}%）。完成了 ${completed.length} 个明确事项。`,
    deepWorkDuration: `${Math.round(deepWorkMinutes)} 分钟 (占比 ${deepRatio}%)`,
    contextSwitchEvaluation: switchEval,
    frictionPoints: friction,
    recommendations: recs,
    energyCurveNote: '精力主要集中在前半段攻坚期，后半段需注意防范低效拖延。',
  };
}
