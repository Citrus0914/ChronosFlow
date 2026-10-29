import { describe, it, expect } from 'vitest';
import { parseWithRules, inferMood, inferCategory, extractTargetDate } from '../src/services/nlpParser';
import { formatDate } from '../src/lib/dateUtils';

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

  it('分类推断应当准确匹配常见技术与业务场景及日常休闲运动', () => {
    expect(inferCategory('排查线上接口502报错')).toBe('开发/技术');
    expect(inferCategory('和产品经理过需求方案')).toBe('工作/业务');
    expect(inferCategory('晚上去健身房跑步')).toBe('健康/运动');
    expect(inferCategory('昨晚早点睡觉8小时')).toBe('健康/运动');
    expect(inferCategory('微信跟朋友聊天半小时')).toBe('休闲/生活');
    expect(inferCategory('Steam打游戏开黑2小时')).toBe('休闲/生活');
    expect(inferCategory('刷B站短视频摸鱼40分钟')).toBe('休闲/生活');
    expect(inferCategory('知乎刷帖子看热点')).toBe('休闲/生活');
  });

  it('应当准确解析24小时制时间段并精准提取起止时间戳', () => {
    const res = parseWithRules('14:00到15:30开架构方案评审会');
    expect(res.durationMinutes).toBe(90);
    expect(res.exactStartTime).toBeDefined();
    expect(res.exactEndTime).toBeDefined();
    expect(res.title).toContain('架构方案评审会');
    expect(res.category).toBe('开发/技术');

    const sD = new Date(res.exactStartTime!);
    expect(sD.getHours()).toBe(14);
    expect(sD.getMinutes()).toBe(0);
    const eD = new Date(res.exactEndTime!);
    expect(eD.getHours()).toBe(15);
    expect(eD.getMinutes()).toBe(30);
  });

  it('应当解析中文钟点时间段（如下午2点到3点半）', () => {
    const res = parseWithRules('从下午2点到3点半修改系统重构方案');
    expect(res.durationMinutes).toBe(90);
    expect(res.title).toContain('修改系统重构方案');
    const sD = new Date(res.exactStartTime!);
    expect(sD.getHours()).toBe(14);
    expect(sD.getMinutes()).toBe(0);
  });

  it('应当精准解析昨天/前天并生成过去日期的起止时间戳（补齐过去记录）', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const res1 = parseWithRules('昨天 14:00到16:00 开架构方案评审会');
    expect(res1.durationMinutes).toBe(120);
    expect(res1.exactStartTime).toBeDefined();
    expect(formatDate(new Date(res1.exactStartTime!))).toBe(yesterdayStr);
    expect(new Date(res1.exactStartTime!).getHours()).toBe(14);
    expect(new Date(res1.exactEndTime!).getHours()).toBe(16);
    expect(res1.title).toContain('架构方案评审会');

    const beforeYesterday = new Date(now);
    beforeYesterday.setDate(now.getDate() - 2);
    const beforeYesterdayStr = formatDate(beforeYesterday);

    const res2 = parseWithRules('前天花了2小时改登录Bug改吐了');
    expect(res2.durationMinutes).toBe(120);
    expect(res2.mood).toBe('FRUSTRATED');
    expect(res2.exactStartTime).toBeDefined();
    expect(formatDate(new Date(res2.exactStartTime!))).toBe(beforeYesterdayStr);
  });

  it('应当识别“补齐昨天”前缀语法', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const res = parseWithRules('补齐昨天 1小时 运动健身');
    expect(res.durationMinutes).toBe(60);
    expect(res.category).toBe('健康/运动');
    expect(res.exactStartTime).toBeDefined();
    expect(formatDate(new Date(res.exactStartTime!))).toBe(yesterdayStr);
  });

  it('应当解析指定公历日期（如10月25日）', () => {
    const res = parseWithRules('10月25日 09:30-11:30 毕业答辩评审');
    expect(res.durationMinutes).toBe(120);
    expect(res.category).toBe('工作/业务');
    const sD = new Date(res.exactStartTime!);
    expect(sD.getMonth()).toBe(9); // 0-indexed 9 is October
    expect(sD.getDate()).toBe(25);
    expect(sD.getHours()).toBe(9);
    expect(sD.getMinutes()).toBe(30);
  });
});
