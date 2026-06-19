// ============================================================
// 群友群穿/mvu_schema.ts
// 主 Schema 定义：十大核心模块 + 派生字段
// ============================================================

import {
  人身安全参考列表,
  保密等级参考列表,
  决策机制参考列表,
  反应堆功率等级参考列表,
  反应堆状态参考列表,
  地方中央关系参考列表,
  基地车移动状态参考列表,
  外部势力了解程度参考列表,
  外部势力态度参考列表,
  弹药储备水平参考列表,
  情报准确度参考列表,
  情报可靠性参考列表,
  我方外交策略参考列表,
  所属体系参考列表,
  技术保密等级参考列表,
  政治阶段参考列表,
  机构性质参考列表,
  机构级别参考列表,
  机构运作状态参考列表,
  核心设备状态参考列表,
  民众态度参考列表,
  物资储备水平参考列表,
  科技自主度参考列表,
  职级参考列表,
  行政区划层级参考列表,
  装备状态参考列表,
  训练水平参考列表,
  议事规则参考列表,
  财政状况参考列表,
  配电系统状态参考列表,
  领导体制参考列表,
} from './constants.ts';
// @ts-expect-error Node ESM schema dump 需要显式 .ts 扩展名，webpack 可正常解析
import { deriveAll } from './transforms.ts';

const clampPercent = (value: number) => _.clamp(value, 0, 100);
const listText = (list: readonly string[]) => list.join('/');

// ─── 模块一：世界 ────────────────────────────────────────
const 世界Schema = z.object({
  当前日期: z.string().describe('格式 YYYY-MM-DD，初始 1905-05-10'),
  当前时间: z.string().describe('格式 HH:MM'),
  政治阶段: z.string().describe(`当前政治阶段，常见取值：${listText(政治阶段参考列表)}，可按剧情扩展`),
  当前大事件: z.string().describe('一句话概括最紧迫事件'),
});

// ─── 模块二：基地车 ──────────────────────────────────────
const 物资储备Schema = z.object({
  储备水平: z.string().describe(`储备水平，常见取值：${listText(物资储备水平参考列表)}，可按剧情扩展`),
  备注: z.string(),
});

const 核心设备Schema = z.object({
  状态: z.string().describe(`设备状态，常见取值：${listText(核心设备状态参考列表)}，可按剧情扩展`),
  备注: z.string(),
});

const 基地车Schema = z.object({
  当前位置: z.string(),
  移动状态: z.string().describe(`移动状态，常见取值：${listText(基地车移动状态参考列表)}，可按剧情扩展`),
  反应堆功率等级: z.string().describe(`反应堆功率档位，常见取值：${listText(反应堆功率等级参考列表)}，可按剧情扩展`),
  配电系统负载: z.coerce.number().transform(clampPercent).describe('0=空载，100=过载'),
  反应堆状态: z.string().describe(`反应堆运行状态，常见取值：${listText(反应堆状态参考列表)}，可按剧情扩展`),
  配电系统状态: z.string().describe(`配电系统状态，常见取值：${listText(配电系统状态参考列表)}，可按剧情扩展`),
  物资储备: z.record(z.string().describe('物资名，可按剧情自由扩展'), 物资储备Schema),
  核心设备状态: z.record(z.string().describe('核心设备名，如 聚变堆/服务器/数控母机/图形工作站'), 核心设备Schema),
  外骨骼现状: z.string().describe('外骨骼数量和状态，如 "10具可用，磁体/电芯不可补货"；初期 10 具'),
});

// ─── 模块三：科技树（研究槽 + 已解锁能力清单）────────────────
// 设计：取消科技节点 record 与被动研发，改用研究槽追踪研发进度。
//   - 主要研究槽/次要研究槽：AI 维护，每项含 节点名/研发进度/启动日期
//   - 研发进度(0-100)：脚本根据 启动日期 + tech_tree.ts 研发总耗时_天 计算应完成比例，
//     AI 据剧情判断实际进度并填写；脚本在进度 ≥ 100 时自动完成节点
//   - 已解锁能力清单：节点完成时由脚本 insert 能力字符串，AI 可读
//   - 科技自主度：由脚本根据已完成节点统计自动计算
const 研究槽Schema = z.object({
  节点名: z.string().describe('tech_tree.ts 中定义的科技节点名'),
  研发进度: z.coerce
    .number()
    .transform(clampPercent)
    .describe('0-100，AI 根据剧情判断填写；100=完成（由脚本检测并解锁能力）'),
  启动日期: z.string().describe('YYYY-MM-DD；空字符串=尚未启动'),
});

const 科技树Schema = z.object({
  主要研究槽: z
    .array(研究槽Schema)
    .transform(data => _.take(data, 8))
    .describe('主要研究方向槽，最多 8 个（初期 1 个，每完成一个整合型节点 +1）'),
  次要研究槽: z
    .array(研究槽Schema)
    .transform(data => _.take(data, 21))
    .describe('次要研究方向槽，最多 21 个（初期 3 个，每完成一个系统性基础节点 +1）'),
  科技发展方针: z.string(),
  技术保密等级: z.string().describe(`整体技术保密策略，常见取值：${listText(技术保密等级参考列表)}`),
  科技自主度: z.string().describe(`由兜底脚本自动计算，常见取值：${listText(科技自主度参考列表)}`),
  已解锁能力清单: z.array(z.string()).describe('已完成节点解锁的能力清单，由脚本在节点完成时自动 insert；AI 只读'),
});

// ─── 模块四：组织结构 ────────────────────────────────────
const 机构制度详情Schema = z.object({
  所属体系: z
    .string()
    .describe(
      `党/政/军/群团/企事业，常见取值：${listText(所属体系参考列表)}；党体系设书记+副书记+常委，政体系设行政首长+党组书记，军体系保留双首长`,
    ),
  机构性质: z
    .string()
    .describe(
      `常设机构/议事协调机构/临时机构/派出机构，常见取值：${listText(机构性质参考列表)}；议事协调机构须填依托部门`,
    ),
  级别: z.string().describe(`机构层级，常见取值：${listText(机构级别参考列表)}，可按剧情扩展`),
  职务体系: z.string().describe('一把手称呼体系，如 总书记-常委/主席-副主席/主任-副主任/连长-排长'),
  领导体制: z
    .string()
    .describe(`条块关系，常见取值：${listText(领导体制参考列表)}；双重领导=既受条条业务领导又受块块属地领导`),
  上级业务主管: z.string().describe('条条上的业务主管机构名；无则填 无'),
  决策规则: z
    .string()
    .describe(`决策与议事方式，常见取值：${listText(决策机制参考列表)} / ${listText(议事规则参考列表)}，可按剧情扩展`),
  任命权限: z.string().describe('该机构负责人的任命主体，如 政治局常委会任命/军委任命'),
  职级: z.string().describe(`主官职级，常见取值：${listText(职级参考列表)}，可按剧情扩展`),
  议事协调备注: z.string().describe('议事协调机构专用：办事机构设在哪个常设部门 / 组长级别；常设机构填 无'),
  请示报告要求: z.string().describe('该机构需向谁请示/报告哪些事项，如 重大行动须请示政治局常委会，每周报告工作'),
  保密等级: z
    .string()
    .describe(`公开/内部/秘密/机密/绝密，常见取值：${listText(保密等级参考列表)}；基地车相关机构通常为机密或绝密`),
});

const 机构Schema = z.object({
  类型: z.string().describe('机构性质，如 决策核心/军事指挥/行政管理/情报机构/临时委员会'),
  一把手: z.string().describe('该机构主官姓名。空缺时填 空缺'),
  二把手: z.string().describe('副手姓名。无则填 无'),
  副职: z.array(z.string()),
  成员: z.array(z.string()),
  权势指数: z.coerce.number().transform(clampPercent).describe('0=虚设，100=绝对核心'),
  运作状态: z.string().describe(`机构运作状态，常见取值：${listText(机构运作状态参考列表)}，可按剧情扩展`),
  当前任务: z.string(),
  实有人数: z.coerce.number(),
  上级机构: z.string().describe('指向机构表中的父机构键名；顶层机构填空字符串'),
  制度详情: 机构制度详情Schema
    .nullable()
    .optional()
    .describe('机构制度深度建模子对象。建政后按需补；初期可省略。AI 在机构 insert/rename/改组时填写，正常轮次保留原值'),
});

const 组织结构Schema = z.object({
  当前体制: z.string().describe('当前政权组织形式，可按剧情自由演变'),
  当前最高权力机构: z.string().describe('机构表中当前实际掌权的顶层机构键名'),
  机构: z.record(z.string().describe('机构名'), 机构Schema),
  财政: z.object({
    货币体系: z.string().describe('货币单位与金银比价，如 "银元，1银元≈0.72两库平银≈1.5克黄金"；1905年金银比价约1:33'),
    收入来源: z.record(z.string().describe('收入项'), z.coerce.number()),
    主要支出: z.record(z.string().describe('支出项'), z.coerce.number()),
    财政状况: z.string().describe(`财政状态，常见取值：${listText(财政状况参考列表)}，可按剧情扩展`),
    预算审批权: z.string().optional().describe('建政后按需补；指向实际掌财权的机构，通常=当前决策核心'),
    审计机构: z.string().optional().describe('建政后按需补；审计/监察财政的机构名，无则填 无'),
  }),
  当前决策核心: z.string().optional().describe('指向决策机构键名，通常=当前最高权力机构。建政后按需补'),
  当前执行首脑: z.string().optional().describe('指向行政执行机构键名，如 边区政府/人民委员会。尚未分立时不填'),
  当前监督机构: z.string().optional().describe('指向监察机构键名，如 监察委员会/纪委。尚未建立不填'),
  行政区划: z
    .record(
      z.string().describe('区划名，如 当涂县/某乡/某村'),
      z.object({
        层级: z
          .string()
          .describe(`据点/村级/乡级/县级/地级/省级，常见取值：${listText(行政区划层级参考列表)}，可按剧情扩展`),
        治理机构: z.string().describe('指向机构 record 中的键名'),
        人口: z.coerce.number(),
        治安状况: z.string().describe('稳固/稳定/紧张/动荡/失控'),
        与中央关系: z.string().describe(`常见取值：${listText(地方中央关系参考列表)}，可按剧情扩展`),
        备注: z.string(),
      }),
    )
    .optional()
    .describe('控制区扩大后 AI 自然 insert 新区划；初期不填'),
  人事: z
    .object({
      干部管理原则: z.string().describe('如 党管干部/军委任命'),
      职级体系: z.string().describe('当前政权采用的职级体系描述'),
      关键岗位任命记录: z
        .array(
          z.object({
            岗位: z.string(),
            任命人: z.string(),
            任命主体: z.string(),
            任命时间: z.string(),
          }),
        )
        .transform(data => _.takeRight(data, 10))
        .describe('近期关键岗位任命记录，保留最近 10 条'),
    })
    .nullable()
    .optional()
    .describe('建政后按需补；初期干部管理粗放，不填'),
});

// ─── 模块五：军事 ────────────────────────────────────────
const 部队Schema = z.object({
  兵力: z.coerce.number(),
  训练水平: z.string().describe(`训练水平，常见取值：${listText(训练水平参考列表)}，可按剧情扩展`),
  士气: z.string(),
  当前位置: z.string(),
  当前任务: z.string(),
  备注: z.string(),
});

const 武器装备Schema = z.object({
  数量: z.coerce.number(),
  来源: z.string(),
  状态: z.string().describe(`装备状态，常见取值：${listText(装备状态参考列表)}，可按剧情扩展`),
  备注: z.string(),
});

const 军事Schema = z.object({
  总兵力: z.coerce.number(),
  部队: z.record(z.string().describe('部队名，与机构表中军事指挥机构尽量对应'), 部队Schema),
  武器装备: z.record(z.string().describe('武器名，可按剧情扩展'), 武器装备Schema),
  现代弹药: z
    .string()
    .describe(
      `现代弹药储备与备注，如 "充足（弹匣装填中）"/"紧张（不可复制，仅剩3个基数）"；常见储备水平：${listText(弹药储备水平参考列表)}，不可逆消耗`,
    ),
});

// ─── 模块六：情报 ────────────────────────────────────────
const 情报节点Schema = z.object({
  情报来源: z.string(),
  可靠性: z.string().describe(`可靠性，常见取值：${listText(情报可靠性参考列表)}，可按剧情扩展`),
  覆盖范围: z.string(),
  最近情报: z.string(),
});

const 情报Schema = z.object({
  对外情报网络: z.record(z.string().describe('目标势力名，与外部势力键名尽量对应'), 情报节点Schema),
  反间谍: z
    .string()
    .describe('反间谍措施与效果，如 "岗哨盘查+通行证制度，效果一般"；常见效果：严密/有效/一般/有漏洞/形同虚设'),
  情报准确度: z.string().describe(`情报准确度，常见取值：${listText(情报准确度参考列表)}，可按剧情扩展`),
  情报盲区: z.string(),
});

// ─── 模块七：外部势力 ────────────────────────────────────
const 外部势力Schema = z.object({
  对穿越者态度: z.string().describe(`态度，常见取值：${listText(外部势力态度参考列表)}，可按剧情扩展`),
  对穿越者了解程度: z.string().describe(`了解程度，常见取值：${listText(外部势力了解程度参考列表)}，可按剧情扩展`),
  在当地影响力: z.coerce.number().transform(clampPercent),
  近期行动: z.string(),
  内部矛盾: z.string(),
  我方外交策略: z.string().describe(`我方外交方针，常见取值：${listText(我方外交策略参考列表)}，可按剧情扩展`),
  外交关系: z.string().describe('接触与协议状态，如 "已通过本地商人传话清廷知县，口头约定互不侵犯"；未接触时填 "无"'),
  内部分支: z.string(),
});

// ─── 模块八：国内情势 ────────────────────────────────────
const 国内情势Schema = z.object({
  控制区范围: z.string(),
  控制区人口: z.coerce.number(),
  控制区治安: z.string(),
  民众态度: z.string().describe(`常见取值：${listText(民众态度参考列表)}，可按剧情扩展`),
  周边军事态势: z.string(),
  周边政权态度: z.string(),
  全国态势: z.string(),
  历史大事件进度: z.string(),
});

// ─── 模块九：角色 ────────────────────────────────────────
const 履历Schema = z.object({
  时间: z.string(),
  事件: z.string(),
  来源: z.string().describe('AI / 兜底脚本 / GM'),
});

const 群友角色Schema = z.object({
  姓名: z.string(),
  性别: z.string(),
  年龄: z.coerce.number(),
  当前职务: z.string(),
  当前位置: z.string(),
  当前活动: z.string(),
  关系动态: z.string(),
  人身安全: z.string().describe(`人身安全，常见取值：${listText(人身安全参考列表)}，已死亡后不可复活`),
  履历: z.array(履历Schema).transform(data => _.takeRight(data, 8)),
});

const 非群友角色Schema = z.object({
  姓名: z.string(),
  性别: z.string(),
  年龄: z.coerce.number(),
  来源: z.string(),
  对穿越者态度: z.string(),
  当前职务: z.string(),
  当前位置: z.string(),
  当前活动: z.string(),
  人身安全: z.string().describe(`人身安全，常见取值：${listText(人身安全参考列表)}，已死亡后不可复活`),
  履历: z.array(履历Schema).transform(data => _.takeRight(data, 5)),
});

// ─── 模块十：事件队列 ────────────────────────────────────
const 事件队列Schema = z.object({
  近期已发生事件: z
    .array(
      z.object({
        事件: z.string(),
        时间: z.string(),
        影响: z.string(),
      }),
    )
    .transform(data => _.takeRight(data, 8)),
  潜在危机: z
    .array(
      z.object({
        危机: z.string(),
        触发条件: z.string(),
        严重程度: z.string(),
      }),
    )
    .transform(data => _.takeRight(data, 6)),
});

export const Schema = z
  .object({
    世界: 世界Schema,
    基地车: 基地车Schema,
    科技树: 科技树Schema,
    组织结构: 组织结构Schema,
    军事: 军事Schema,
    情报: 情报Schema,
    外部势力: z.record(z.string().describe('外部势力名，可按剧情自由扩展'), 外部势力Schema),
    国内情势: 国内情势Schema,
    群友角色: z.record(z.string().describe('群友姓名'), 群友角色Schema),
    非群友角色: z.record(z.string().describe('非群友角色姓名'), 非群友角色Schema),
    事件队列: 事件队列Schema,
  })
  // @ts-expect-error RuntimeMvuData 接口的字段是完整 Schema 的子集，Zod 推导的输出类型无法直接赋值
  .transform(deriveAll);
