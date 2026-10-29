import type { Activity } from '../types';
import { formatDate } from '../lib/dateUtils';

/**
 * 生成过去 5 周（35天）的精编真实生活与工作示例数据
 * 重点覆盖：QQ微信聊天、玩游戏、刷视频、刷帖子、运动、睡觉、工作与学习
 */
export function generateFiveWeeksDemoActivities(baseDate = new Date()): Activity[] {
  const activities: Activity[] = [];

  // 生成 35 天（从 34 天前一直到今天 0 天前）
  for (let dayOffset = 34; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() - dayOffset);

    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const d = targetDate.getDate();
    const dateStr = formatDate(targetDate);
    const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 辅助函数：构造某一天的指定起止时间戳
    const makeTime = (startH: number, startM: number, endH: number, endM: number) => {
      const start = new Date(y, m, d, startH, startM, 0, 0).getTime();
      const end = new Date(y, m, d, endH, endM, 0, 0).getTime();
      const duration = Math.round((end - start) / 60000);
      return { start, end, duration };
    };

    if (isWeekend) {
      // ===== 周末日常节奏 (丰富休闲娱乐、社交聊天、运动与休整) =====
      
      // 1. 周末充足睡眠
      const t1 = makeTime(0, 30, 9, 0);
      activities.push({
        id: `demo-act-${dateStr}-1`,
        rawInput: `${dateStr} 00:30-09:00 周末自然醒深度睡眠，彻底回血`,
        title: '周末自然醒深度睡眠',
        category: '健康/运动',
        tags: ['健康', '睡眠'],
        startTime: t1.start,
        endTime: t1.end,
        durationMinutes: t1.duration,
        status: 'COMPLETED',
        mood: 'FLOW',
      });

      // 2. 深度阅读/学习探索
      const t2 = makeTime(10, 0, 11, 30);
      activities.push({
        id: `demo-act-${dateStr}-2`,
        rawInput: `${dateStr} 10:00-11:30 深入阅读系统架构设计与AI论文`,
        title: '阅读系统设计与AI前沿论文',
        category: '学习/提升',
        tags: ['学习', '阅读'],
        startTime: t2.start,
        endTime: t2.end,
        durationMinutes: t2.duration,
        status: 'COMPLETED',
        mood: 'FOCUSED',
      });

      // 3. 午间吃外卖 + 逛贴吧知乎刷帖子
      const t3 = makeTime(12, 0, 13, 0);
      activities.push({
        id: `demo-act-${dateStr}-3`,
        rawInput: `${dateStr} 12:00-13:00 吃午饭并刷知乎帖子、贴吧与小红书摸鱼`,
        title: '刷知乎贴吧看热帖与小红书攻略',
        category: '休闲/生活',
        tags: ['休闲', '刷帖子'],
        startTime: t3.start,
        endTime: t3.end,
        durationMinutes: t3.duration,
        status: 'COMPLETED',
        mood: 'DISTRACTED',
      });

      // 4. 下午沉浸式玩游戏
      const t4 = makeTime(14, 0, 17, 0);
      activities.push({
        id: `demo-act-${dateStr}-4`,
        rawInput: `${dateStr} 14:00-17:00 Steam沉浸式玩单机游戏3小时，心流超爽`,
        title: 'Steam沉浸式玩单机游戏大作',
        category: '休闲/生活',
        tags: ['休闲', '游戏'],
        startTime: t4.start,
        endTime: t4.end,
        durationMinutes: t4.duration,
        status: 'COMPLETED',
        mood: 'FLOW',
      });

      // 5. 傍晚体育运动健身
      const t5 = makeTime(17, 30, 18, 45);
      activities.push({
        id: `demo-act-${dateStr}-5`,
        rawInput: `${dateStr} 17:30-18:45 健身房器械撸铁与跑步运动，暴汗很爽`,
        title: '健身房器械撸铁与跑步锻炼',
        category: '健康/运动',
        tags: ['健康', '健身'],
        startTime: t5.start,
        endTime: t5.end,
        durationMinutes: t5.duration,
        status: 'COMPLETED',
        mood: 'FLOW',
      });

      // 6. 晚间QQ/微信语音与朋友聊天
      const t6 = makeTime(19, 30, 20, 30);
      activities.push({
        id: `demo-act-${dateStr}-6`,
        rawInput: `${dateStr} 19:30-20:30 微信跟朋友语音聊天与QQ水群`,
        title: '微信跟好友语音交流与QQ群水群',
        category: '休闲/生活',
        tags: ['休闲', '聊天'],
        startTime: t6.start,
        endTime: t6.end,
        durationMinutes: t6.duration,
        status: 'COMPLETED',
        mood: 'NORMAL',
      });

      // 7. 深夜刷短视频放松
      const t7 = makeTime(21, 0, 22, 30);
      activities.push({
        id: `demo-act-${dateStr}-7`,
        rawInput: `${dateStr} 21:00-22:30 躺平刷抖音短视频和B站看剧`,
        title: '躺平刷短视频与B站看剧放松',
        category: '休闲/生活',
        tags: ['休闲', '刷视频'],
        startTime: t7.start,
        endTime: t7.end,
        durationMinutes: t7.duration,
        status: 'COMPLETED',
        mood: 'DISTRACTED',
      });
    } else {
      // ===== 工作日日常节奏 (张弛有度，涵盖作息、专注工作、摸鱼娱乐与锻炼) =====
      
      // 1. 夜间健康睡眠 (前晚到早晨)
      const t1 = makeTime(0, 0, 7, 30);
      activities.push({
        id: `demo-act-${dateStr}-1`,
        rawInput: `${dateStr} 00:00-07:30 夜间健康深度睡眠7.5小时`,
        title: '夜间健康深度睡眠',
        category: '健康/运动',
        tags: ['健康', '睡眠'],
        startTime: t1.start,
        endTime: t1.end,
        durationMinutes: t1.duration,
        status: 'COMPLETED',
        mood: 'NORMAL',
      });

      // 2. 早晨微信/QQ沟通与晨间准备
      const t2 = makeTime(8, 0, 8, 45);
      activities.push({
        id: `demo-act-${dateStr}-2`,
        rawInput: `${dateStr} 08:00-08:45 微信回复工作与生活消息，QQ群看动态`,
        title: '微信回复消息与晨间QQ群浏览',
        category: '休闲/生活',
        tags: ['休闲', '聊天'],
        startTime: t2.start,
        endTime: t2.end,
        durationMinutes: t2.duration,
        status: 'COMPLETED',
        mood: 'NORMAL',
      });

      // 3. 上午核心技术攻坚与深度开发
      const t3 = makeTime(9, 30, 12, 0);
      activities.push({
        id: `demo-act-${dateStr}-3`,
        rawInput: `${dateStr} 09:30-12:00 核心模块开发与架构重构，专注解决Bug`,
        title: '核心架构重构与业务模块开发',
        category: '开发/技术',
        tags: ['开发', '架构'],
        startTime: t3.start,
        endTime: t3.end,
        durationMinutes: t3.duration,
        status: 'COMPLETED',
        mood: 'FOCUSED',
      });

      // 4. 午餐 + 刷短视频摸鱼
      const t4 = makeTime(12, 15, 13, 0);
      activities.push({
        id: `demo-act-${dateStr}-4`,
        rawInput: `${dateStr} 12:15-13:00 吃午饭刷B站视频与抖音短视频`,
        title: '午餐并刷B站科技视频与短视频摸鱼',
        category: '休闲/生活',
        tags: ['休闲', '刷视频'],
        startTime: t4.start,
        endTime: t4.end,
        durationMinutes: t4.duration,
        status: 'COMPLETED',
        mood: 'DISTRACTED',
      });

      // 5. 中午午休小憩
      const t5 = makeTime(13, 0, 13, 30);
      activities.push({
        id: `demo-act-${dateStr}-5`,
        rawInput: `${dateStr} 13:00-13:30 午休补觉半小时`,
        title: '午休小憩补觉30分钟',
        category: '健康/运动',
        tags: ['健康', '休息'],
        startTime: t5.start,
        endTime: t5.end,
        durationMinutes: t5.duration,
        status: 'COMPLETED',
        mood: 'NORMAL',
      });

      // 6. 下午业务沟通与方案评审
      const t6 = makeTime(14, 0, 16, 30);
      activities.push({
        id: `demo-act-${dateStr}-6`,
        rawInput: `${dateStr} 14:00-16:30 跨团队方案评审与业务需求会议`,
        title: '业务需求研讨与方案技术评审',
        category: '工作/业务',
        tags: ['工作', '会议'],
        startTime: t6.start,
        endTime: t6.end,
        durationMinutes: t6.duration,
        status: 'COMPLETED',
        mood: 'FOCUSED',
      });

      // 7. 下午茶水群与知乎刷帖子
      const t7 = makeTime(16, 30, 17, 15);
      activities.push({
        id: `demo-act-${dateStr}-7`,
        rawInput: `${dateStr} 16:30-17:15 QQ群水群交流、知乎刷帖子摸鱼`,
        title: 'QQ群水群与知乎刷帖子看行业热点',
        category: '休闲/生活',
        tags: ['休闲', '刷帖子'],
        startTime: t7.start,
        endTime: t7.end,
        durationMinutes: t7.duration,
        status: 'COMPLETED',
        mood: 'DISTRACTED',
      });

      // 8. 傍晚跑步/运动锻炼
      const t8 = makeTime(18, 30, 19, 15);
      activities.push({
        id: `demo-act-${dateStr}-8`,
        rawInput: `${dateStr} 18:30-19:15 户外慢跑5公里与拉伸散步`,
        title: '户外慢跑5公里与拉伸锻炼',
        category: '健康/运动',
        tags: ['健康', '跑步'],
        startTime: t8.start,
        endTime: t8.end,
        durationMinutes: t8.duration,
        status: 'COMPLETED',
        mood: 'FLOW',
      });

      // 9. 晚间游戏开黑娱乐
      const t9 = makeTime(20, 30, 22, 15);
      activities.push({
        id: `demo-act-${dateStr}-9`,
        rawInput: `${dateStr} 20:30-22:15 玩游戏和好友排位开黑`,
        title: '玩游戏排位与好友开黑对战',
        category: '休闲/生活',
        tags: ['休闲', '游戏'],
        startTime: t9.start,
        endTime: t9.end,
        durationMinutes: t9.duration,
        status: 'COMPLETED',
        mood: dayOffset % 3 === 0 ? 'FLOW' : 'NORMAL',
      });

      // 10. 睡前微信聊天
      const t10 = makeTime(22, 30, 23, 15);
      activities.push({
        id: `demo-act-${dateStr}-10`,
        rawInput: `${dateStr} 22:30-23:15 睡前微信跟朋友闲聊扯淡`,
        title: '睡前微信跟好友日常闲聊',
        category: '休闲/生活',
        tags: ['休闲', '聊天'],
        startTime: t10.start,
        endTime: t10.end,
        durationMinutes: t10.duration,
        status: 'COMPLETED',
        mood: 'NORMAL',
      });
    }
  }

  // 按开始时间正序排列
  return activities.sort((a, b) => a.startTime - b.startTime);
}
