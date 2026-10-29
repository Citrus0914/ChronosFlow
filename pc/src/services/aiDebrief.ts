import type { Activity, AICoachDebrief, AppSettings, CategoryBudget } from '../types';

export async function generateAICoachDebrief(
  activities: Activity[],
  settings: AppSettings,
  period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
  periodLabel: string = '今日',
  budgets: CategoryBudget[] = []
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
    return generateLocalDebrief(
      totalMinutes,
      deepWorkMinutes,
      contextSwitches,
      frustratedOrTired,
      completed,
      period,
      periodLabel,
      budgets
    );
  }

  const payload = completed.map((a) => ({
    title: a.title,
    category: a.category,
    durationMin: a.durationMinutes,
    mood: a.mood,
    rawInput: a.rawInput,
  }));

  const periodContextDesc =
    period === 'WEEK'
      ? `【${periodLabel}】全周`
      : period === 'MONTH'
      ? `【${periodLabel}】全月`
      : `【${periodLabel}】`;

  const nextStepDesc =
    period === 'WEEK'
      ? '针对下周的可落地行动优化微建议'
      : period === 'MONTH'
      ? '针对下月的目标聚焦与精力调优建议'
      : '针对明天的可落地微行动建议';

  const systemPrompt = `你是一位顶尖的认知科学与高绩效精力管理教练（类似《深度工作》与《番茄工作法》的导师）。
请分析用户${periodContextDesc}的时间流与精力数据，给出深刻、具宏观节奏感与针对性的复盘指导。
必须返回严格合法的单行 JSON 格式：
{
  "overview": "${periodContextDesc}总体评价与精炼洞察（80-140字，指出该周期最核心的价值产出与节奏）",
  "deepWorkDuration": "例如：${period === 'WEEK' ? '12 小时 30 分钟 (占比 55%)' : period === 'MONTH' ? '52 小时 (占比 48%)' : '2 小时 20 分钟 (占比 65%)'}",
  "contextSwitchEvaluation": "例如：切换较少，心流保持良好 / 任务碎片化偏高，注意多任务损耗",
  "frictionPoints": [
    "阻力或思维卡点1（结合情绪标签与具体事件剖析）",
    "阻力或思维卡点2"
  ],
  "recommendations": [
    "${nextStepDesc}1",
    "${nextStepDesc}2"
  ],
  "energyCurveNote": "对${periodContextDesc}精力流动与节奏周期的教练点评（40-70字）"
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s 超时保障快速响应

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
            content: `${periodContextDesc}时间记录清单（共 ${completed.length} 个任务，累计耗时 ${totalMinutes} 分钟）：\n${JSON.stringify(payload, null, 2)}`,
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
      return generateLocalDebrief(
        totalMinutes,
        deepWorkMinutes,
        contextSwitches,
        frustratedOrTired,
        completed,
        period,
        periodLabel,
        budgets
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return generateLocalDebrief(
        totalMinutes,
        deepWorkMinutes,
        contextSwitches,
        frustratedOrTired,
        completed,
        period,
        periodLabel
      );
    }

    const parsed = JSON.parse(content);
    return {
      overview: parsed.overview || `${periodContextDesc}时间节奏整体平稳，关键攻坚任务推进顺利。`,
      deepWorkDuration: parsed.deepWorkDuration || `${Math.round(deepWorkMinutes)} 分钟`,
      contextSwitchEvaluation: parsed.contextSwitchEvaluation || '任务切换适度，具备良好的工作连续性。',
      frictionPoints: Array.isArray(parsed.frictionPoints) ? parsed.frictionPoints : ['部分攻坚时段缺乏及时的认知恢复。'],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [period === 'WEEK' ? '下周保持黄金时段攻坚，减少即时通讯打扰。' : '持续使用时间盒模式保持专注深度。'],
      energyCurveNote: parsed.energyCurveNote || '精力主要集中在前半段攻坚期，注意劳逸结合。',
    };
  } catch (err) {
    console.warn('Fallback to local debrief:', err);
    return generateLocalDebrief(
      totalMinutes,
      deepWorkMinutes,
      contextSwitches,
      frustratedOrTired,
      completed,
      period,
      periodLabel,
      budgets
    );
  }
}

function generateLocalDebrief(
  totalMinutes: number,
  deepWorkMinutes: number,
  contextSwitches: number,
  frustratedList: Activity[],
  completed: Activity[],
  period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
  periodLabel: string = '今日',
  budgets: CategoryBudget[] = []
): AICoachDebrief {
  const deepRatio = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const deepHours = Math.floor(deepWorkMinutes / 60);
  const deepMins = deepWorkMinutes % 60;

  const deepWorkDurationStr =
    deepHours > 0
      ? `${deepHours} 小时 ${deepMins} 分钟 (占比 ${deepRatio}%)`
      : `${deepMins} 分钟 (占比 ${deepRatio}%)`;

  let switchEval = '任务切换次数适中，具备良好的工作连续性。';
  if (contextSwitches > 15) {
    switchEval = `该周期内累计发生 ${contextSwitches} 次任务切换，注意力碎片化明显，需警惕注意力残留损耗。`;
  } else if (contextSwitches < 4) {
    switchEval = '心流状态极佳，任务聚焦度高，很少受到无效多任务打扰。';
  }

  const friction: string[] = [];
  if (frustratedList.length > 0) {
    const titles = frustratedList.slice(0, 3).map((a) => `“${a.title}”`).join('、');
    friction.push(`在 ${titles} 等任务中标记了受挫或疲惫情绪，出现了阶段性思维卡壳。`);
  }
  if (totalMinutes > 2400) {
    // 40小时以上
    friction.push('累计工作负荷处于高位，需警惕长期高强度导致的隐性意志力衰竭。');
  }
  if (friction.length === 0) {
    friction.push(`${period === 'WEEK' ? '本周' : period === 'MONTH' ? '本月' : '今日'}未出现明显负向情绪阻力，各事项推进平稳顺畅。`);
  }

  let overviewText = '';
  let recommendations: string[] = [];
  let energyCurveNote = '';

  if (period === 'WEEK') {
    overviewText = `在【${periodLabel}】全周中，累计记录有效工作 ${hours} 小时 ${mins} 分钟，其中深度心流时间约 ${deepWorkDurationStr}。全周共稳步推进 ${completed.length} 个明确事项，攻坚成果显著。`;
    recommendations = [
      deepRatio >= 45
        ? '本周深度工作占比优异，下周建议继续锁定上午黄金专注期推进高难度攻坚。'
        : '下周建议尝试在日程中设立“无会议专注日”，增加单次 60 分钟以上的时间盒。',
      '遇到排查或调研卡壳超过 30 分钟时，强制离开屏幕散步，利用发散思维寻找破局点。',
    ];

    // 预算偏差诊断
    const enabledBudgets = budgets.filter((b) => b.isEnabled);
    const exceeded = enabledBudgets.find((b) => {
      const spentMin = completed
        .filter((a) => a.category === b.category)
        .reduce((sum, a) => sum + a.durationMinutes, 0);
      return b.budgetType === 'AT_MOST' && spentMin > b.weeklyTargetHours * 60;
    });
    if (exceeded) {
      recommendations.unshift(`⚠️ 预算超支提醒：本周「${exceeded.category}」已超出预设上限，注意防止休闲时间赤字。`);
    } else {
      const behind = enabledBudgets.find((b) => {
        const spentMin = completed
          .filter((a) => a.category === b.category)
          .reduce((sum, a) => sum + a.durationMinutes, 0);
        return b.budgetType === 'AT_LEAST' && spentMin < b.weeklyTargetHours * 60 * 0.4;
      });
      if (behind) {
        recommendations.push(`🎯 预算推进建议：本周「${behind.category}」投入相对滞后，下周可为其预留核心攻坚时段。`);
      }
    }

    energyCurveNote = '周中生产力峰值明显，周末宜完全脱离工作情境，为新一周蓄力充能。';
  } else if (period === 'MONTH') {
    overviewText = `在【${periodLabel}】全月中，累计记录有效工作投入约 ${hours} 小时，深度专注达到 ${deepWorkDurationStr}。整月共归档 ${completed.length} 个时间块，长期沉淀与产出扎实。`;
    recommendations = [
      '新一个月建议选定 1-2 个最核心的战略里程碑，优先保障核心产出，防范边缘事务稀释精力。',
      '回顾本月中高频出现的高效心流时段，在新月份将其固化为日常习惯。',
    ];
    energyCurveNote = '月度节奏具有良好韧性，建议保持工作与恢复的节律平衡，防范职场倦怠。';
  } else {
    overviewText = `今日累计记录有效工作 ${hours} 小时 ${mins} 分钟，其中深度心流时间约 ${deepWorkDurationStr}。完成了 ${completed.length} 个明确事项。`;
    recommendations = [
      deepRatio >= 50
        ? '深度工作占比超 50%，保持当前节奏，明天尝试将最难的任务放在第一个 90 分钟块。'
        : '建议明天尝试使用“时间盒”模式，设定至少一个 45 分钟无打扰专注段。',
      '遇到调试或卡点超过 25 分钟时，强制离开屏幕散步 3 分钟，利用发散思维寻找破局点。',
    ];
    energyCurveNote = '精力主要集中在前半段攻坚期，后半段需注意防范低效拖延。';
  }

  return {
    overview: overviewText,
    deepWorkDuration: deepWorkDurationStr,
    contextSwitchEvaluation: switchEval,
    frictionPoints: friction,
    recommendations,
    energyCurveNote,
  };
}
