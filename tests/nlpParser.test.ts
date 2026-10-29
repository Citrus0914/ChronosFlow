import { describe, it, expect } from 'vitest';
import { parseWithRules, inferMood, inferCategory } from '../src/services/nlpParser';

describe('ChronosFlow NLP Rule Engine', () => {
  it('应当识别“开始做某事”为实时专注启动', () => {
    const res = parseWithRules('开始写前端架构代码');
    expect(res.isRealtimeStart).toBe(true);
    expect(res.category).toBe('开发/技术');
    expect(res.title).toContain('前端架构代码');
  });

  it('应当提取明确的分钟数与事后记录', () => {
    const res = parseWithRules('刚刚花了40分钟做需求评审');
    expect(res.isRealtimeStart).toBe(false);
    expect(res.durationMinutes).toBe(40);
    expect(res.category).toBe('工作/业务');
    expect(res.title).toContain('需求评审');
  });

  it('应当精准解析小时和半小时', () => {
    const res1 = parseWithRules('改Bug改吐了，用了1.5小时');
    expect(res1.durationMinutes).toBe(90);
    expect(res1.mood).toBe('FRUSTRATED');

    const res2 = parseWithRules('看论文半小时，很顺手');
    expect(res2.durationMinutes).toBe(30);
    expect(res2.category).toBe('学习/提升');
    expect(res2.mood).toBe('FLOW');
  });

  it('情绪推断应当对负向/疲惫/心流关键词敏感', () => {
    expect(inferMood('心流状态极其高效')).toBe('FLOW');
    expect(inferMood('改PPT改吐了实在卡壳')).toBe('FRUSTRATED');
    expect(inferMood('好累太犯困了')).toBe('TIRED');
    expect(inferMood('普通日常例会')).toBe('NORMAL');
  });

  it('分类推断应当准确匹配常见技术与业务场景', () => {
    expect(inferCategory('排查线上接口502报错')).toBe('开发/技术');
    expect(inferCategory('和产品经理过需求方案')).toBe('工作/业务');
    expect(inferCategory('晚上去健身房跑步')).toBe('健康/运动');
  });
});
