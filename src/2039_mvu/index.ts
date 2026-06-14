// ============================================================
// src/2039_mvu/index.ts
// 入口文件：注册Schema + VARIABLE_UPDATE_ENDED 模块间联动
// ============================================================

import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from './mvu_schema';
import type { MvuData } from './types';

$(() => {
  // ─── 注册 Schema ────────────────────────────────────
  registerMvuSchema(Schema);

  // ─── 模块间联动：VARIABLE_UPDATE_ENDED 后处理 ─────────

  void (async () => {
    await waitGlobalInitialized('Mvu');

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      const data = variables.stat_data as MvuData;
      const before = variables_before.stat_data as MvuData;

      // 1. 选举进程 → 政治阶段联动
      if (!_.isEqual(data.日本执政?.选举进程, before.日本执政?.选举进程)) {
        const 阶段 = data.日本执政?.选举进程?.阶段 ?? '';
        const 类型 = data.日本执政?.选举进程?.类型;

        // 选举类型切换
        if (data.日本执政?.选举进程?.类型 !== before.日本执政?.选举进程?.类型) {
          _.set(data, '世界.选举模式', data.日本执政?.选举进程?.类型 ?? '无');
        }

        // 特别大选阶段推进
        if (类型 === '2039特别大选') {
          if (阶段.includes('报名')) _.set(data, '世界.政治阶段', '特别大选报名期');
          else if (阶段.includes('初选')) _.set(data, '世界.政治阶段', '特别大选初选期');
          else if (阶段.includes('指名')) _.set(data, '世界.政治阶段', '特别大选指名期');
        }

        // 正常选举
        if (类型 === '正常首相指名') {
          if (阶段 === '已完成') _.set(data, '世界.政治阶段', '新内阁执政期');
          else _.set(data, '世界.政治阶段', '正常选举期');
        }

        // 无人参选 → 触发特别大选切换
        if (阶段 === '无人愿意出任首相' && 类型 === '正常首相指名') {
          _.set(data, '日本执政.选举进程.类型', '2039特别大选');
          _.set(data, '日本执政.选举进程.阶段', '互联网报名');
          _.set(data, '世界.选举模式', '2039特别大选');
          _.set(data, '世界.政治阶段', '特别大选报名期');
        }
      }

      // 2. 首相状态变化 → 政治阶段联动
      if (data.日本执政?.首相状态 !== before.日本执政?.首相状态) {
        if (data.日本执政?.首相状态 === '空位') {
          _.set(data, '世界.政治阶段', '看守停摆期');
        } else if (data.日本执政?.首相状态 === '新任') {
          _.set(data, '世界.政治阶段', '新内阁执政期');
          _.set(data, '日本执政.选举进程.类型', '无');
          _.set(data, '日本执政.选举进程.阶段', '已完成');
          _.set(data, '世界.选举模式', '无');
        }
      }

      // 3. 阁僚 ↔ 各角色情况安全状况同步
      const 阁僚们 = data.日本执政?.本届内阁?.主要阁僚 ?? {};
      const 角色们 = data.各角色情况 ?? {};

      for (const [阁僚职位, 阁僚] of Object.entries(阁僚们)) {
        const 阁僚名 = 阁僚.姓名;
        // 按姓名匹配角色情况中的条目
        const 角色 = 角色们[阁僚名];
        if (角色) {
          // 安全状况同步：阁僚Schema → 各角色情况
          if (阁僚.人身安全状况 === '已死亡') {
            _.set(data, ['各角色情况', 阁僚名, '人身安全'], '已死亡');
          } else if (阁僚.暗杀威胁等级 === '极高' || 阁僚.暗杀威胁等级 === '高') {
            _.set(data, ['各角色情况', 阁僚名, '人身安全'], '需要安保');
          }

          // 担任公职同步
          if (角色.担任公职 !== 阁僚职位) {
            _.set(data, ['各角色情况', 阁僚名, '担任公职'], 阁僚职位);
          }

          // 政治卷入度同步：在阁僚中 → 深度卷入
          if (角色.政治卷入度 !== '深度卷入') {
            _.set(data, ['各角色情况', 阁僚名, '政治卷入度'], '深度卷入');
          }
        }
      }

      // 反向同步：各角色情况 → 阁僚Schema（当角色死亡/失踪时标记阁僚）
      for (const [角色名, 角色] of Object.entries(角色们)) {
        const 匹配阁僚 = Object.entries(阁僚们).find(([, g]) => g.姓名 === 角色名);
        if (匹配阁僚) {
          const [职位] = 匹配阁僚;
          if (角色.人身安全 === '已死亡') {
            _.set(data, ['日本执政', '本届内阁', '主要阁僚', 职位, '人身安全状况'], '已死亡');
          } else if (角色.人身安全 === '失踪') {
            _.set(data, ['日本执政', '本届内阁', '主要阁僚', 职位, '人身安全状况'], '受到威胁');
          }
        }
      }

      // 4. 事件发生 → 舆论场联动
      if (!_.isEqual(data.事件队列?.近期已发生事件, before.事件队列?.近期已发生事件)) {
        const 最新事件 = data.事件队列?.近期已发生事件?.at(-1);
        if (最新事件) {
          // 自动追加为社交媒体热点
          const 现有热点 = data.舆论场?.社交媒体热点 ?? [];
          const 新热点 = `#${最新事件.事件.slice(0, 20)}`;
          if (!现有热点.includes(新热点) && 现有热点.length < 8) {
            _.set(data, '舆论场.社交媒体热点', [...现有热点, 新热点]);
          }

          // 同步当前大事件
          _.set(data, '世界.当前大事件', 最新事件.事件);
        }
      }

      // 5. 粮食供应变化 → 民众心态 + 潜在危机联动
      if (data.日本国内情势?.粮食供应等级 !== before.日本国内情势?.粮食供应等级) {
        const 粮食 = data.日本国内情势?.粮食供应等级;
        if (粮食 === '饥荒边缘' || 粮食 === '黑市依赖') {
          // 追加潜在危机
          const 现有危机 = data.事件队列?.潜在危机 ?? [];
          const 已存在 = 现有危机.some(c => c.危机.includes('粮食'));
          if (!已存在 && 现有危机.length < 5) {
            _.set(data, '事件队列.潜在危机', [
              ...现有危机,
              { 危机: '粮食危机引发大规模社会动荡', 触发条件: '米价继续上涨或走私粮渠道中断', 严重程度: '高' },
            ]);
          }
        }
      }
    });
  })();
});
