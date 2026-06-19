// ============================================================
// src/2039_mvu/mvu_schema.ts
// 主Schema定义：7个顶层模块 + 13个子Schema，约120个字段
// ============================================================

// @ts-expect-error Node ESM schema dump 需要显式 .ts 扩展名，webpack 可正常解析
import {
  CSDC接受度列表,
  LiveHouse运营状态列表,
  与CSAT的关系列表,
  与内阁的关系列表,
  与农协的关系列表,
  与司法的关系列表,
  与大企业的关系列表,
  与官僚体系的争斗状态列表,
  与极道的关系列表,
  与美国CIA的关系列表,
  与议会的关系列表,
  主流媒体立场列表,
  事务次官会议决策方式列表,
  事务次官会议合法性列表,
  事务次官会议权力等级列表,
  事务次官会议状态列表,
  事务次官出身派系列表,
  事务次官实权程度列表,
  事务次官对阁僚态度列表,
  事务次官更替方式列表,
  互联网状况列表,
  人身安全列表,
  人身安全状况列表,
  候选人威胁等级列表,
  候选人背景列表,
  停电状况列表,
  内阁对事务次官会议的态度列表,
  农协与走私粮对抗列表,
  农协状态列表,
  副大臣任命方式列表,
  副大臣对官僚态度列表,
  副大臣对阁僚态度列表,
  医疗供应等级列表,
  危机严重程度列表,
  在日情报网络列表,
  在日行动能力列表,
  地检署态度列表,
  基础设施维护列表,
  夜间治安列表,
  娱乐产业外部渗透列表,
  娱乐产业景气度列表,
  实际履职状态列表,
  富裕阶层外流列表,
  对内阁态度列表,
  对当前职位的态度列表,
  对日本政府态度列表,
  对日策略倾向列表,
  对特别大选态度列表,
  对职务理解度列表,
  已决议事项执行状态列表,
  年轻人出路分化列表,
  执行难度列表,
  提出者理解度列表,
  政治卷入度列表,
  政治立场列表,
  政治阶段列表,
  政策影响领域列表,
  政策推行状态列表,
  政策效果评估列表,
  政策类型列表,
  教育状况列表,
  无家可归者列表,
  日元贬值趋势列表,
  暗杀威胁等级列表,
  治安等级列表,
  派系政治倾向列表,
  生命维持餐依赖趋势列表,
  生命维持餐运作状态列表,
  省厅运作状态列表,
  社会群体对政府态度列表,
  粮食供应等级列表,
  经济状况列表,
  能源供应等级列表,
  自警团武装化程度列表,
  货币信任度列表,
  选举模式列表,
  选举进程阶段列表,
  通胀等级列表,
  预算影响列表,
  首相状态列表,
} from './constants.ts';
// @ts-expect-error Node ESM schema dump 需要显式 .ts 扩展名，webpack 可正常解析
import { deriveAll } from './transforms.ts';

// ============================================================
// 一、世界模块（时间轴 + 阶段标记）
// ============================================================

const 世界Schema = z.object({
  当前日期: z.string(),
  当前时间: z.string(),
  政治阶段: z.enum(政治阶段列表),
  选举模式: z.enum(选举模式列表),
  当前大事件: z.string(),
});

// ============================================================
// 二、日本执政模块（权力中枢）
// ============================================================

// ─── 阁僚子Schema ─────────────────────────────────────────

const 阁僚Schema = z.object({
  姓名: z.string(),
  年龄: z.coerce.number(),
  原身份: z.string().describe('就任前的身份'),

  // 政治能力（核心落差维度）
  政治立场: z.string().describe('阁僚的政治立场'),
  对职务理解度: z.enum(对职务理解度列表),
  实际履职状态: z.enum(实际履职状态列表),

  // 操控与被操控（双向权力关系）
  幕后操控者: z.string().describe('试图操控该职位的人或势力'),
  操控程度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('0=完全自主，100=纯傀儡'),
  被操控方式: z.string().describe('操控该职位的方式'),

  // 反向影响力
  对官僚体系的影响力: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('0=完全被忽视，100=能左右官僚决策'),
  影响力来源: z.string().describe('影响力的来源'),
  与官僚体系的争斗状态: z.enum(与官僚体系的争斗状态列表),
  官僚体系的应对: z.string().describe('官僚/利益集团对阁僚反抗的反应'),

  // 个人状态（少女视角）
  对当前职位的态度: z.enum(对当前职位的态度列表),
  当前心理状态: z.string().describe('当前的心理状态'),
  更关心的事: z.string().describe('她心里真正在意的'),

  // 安全与忠诚
  忠诚度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('对首相/内阁的忠诚度，0-100'),
  暗杀威胁等级: z.enum(暗杀威胁等级列表),
  人身安全状况: z.enum(人身安全状况列表),
});

// ─── 本届内阁子Schema ─────────────────────────────────────

const 本届内阁Schema = z.object({
  届数: z.coerce.number(),
  首相政治立场: z.enum(政治立场列表),
  执政联盟: z.array(z.string().describe('联盟势力名')),
  内阁稳定度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  主要阁僚: z.record(z.string().describe('职位名'), 阁僚Schema),
});

// ─── 政策子Schema ─────────────────────────────────────────

const 政策Schema = z.object({
  内容: z.string().describe('政策简述'),
  类型: z.enum(政策类型列表),
  推行状态: z.enum(政策推行状态列表),

  // 来源与推动者
  提出者: z.string().describe('最初提出该政策的人或机构'),
  提出者理解度: z.enum(提出者理解度列表),
  主要推动方: z.string().describe('真正在推动政策落地的力量'),
  主要反对方: z.string().describe('主要反对势力'),
  反对方式: z.string().describe('主要反对势力的反对方式'),

  // 执行层面
  主管省厅: z.string().describe('负责执行该政策的省厅'),
  主管阁僚: z.string().describe('名义上负责的阁僚姓名'),
  预算影响: z.enum(预算影响列表),
  执行难度: z.enum(执行难度列表),

  // 政策效果
  预期效果: z.string().describe('推行方声称的政策目标'),
  实际效果: z.string().describe('政策实际产生的效果'),
  效果评估: z.enum(政策效果评估列表),
  副作用: z.string().describe('未预料到的副作用'),

  // 影响维度
  影响领域: z.array(z.enum(政策影响领域列表)),
  对CSAT影响: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  对美影响: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  对内阁稳定度影响: z.coerce.number().transform(v => _.clamp(v, -100, 100)),

  // 时间线
  提出日期: z.string(),
  关键节点: z.string().describe('政策推进的关键时间节点'),
  备注: z.string().describe('其他特殊情况说明'),
});

// ─── 候选人子Schema ───────────────────────────────────────

const 候选人Schema = z.object({
  姓名: z.string(),
  所属党派: z.string().describe('所属党派'),
  背景: z.enum(候选人背景列表),
  当前票数: z.coerce.number(),
  威胁等级: z.enum(候选人威胁等级列表),
  外部支持: z.string().describe('幕后支持势力'),
});

// ─── 选举进程子Schema ─────────────────────────────────────

/** 两种选举模式的共用字段 + 模式特有字段 */
const 选举进程Schema = z.object({
  // ── 共用字段 ──
  类型: z.enum(选举模式列表),
  阶段: z.enum(选举进程阶段列表),
  候选人排名: z.array(候选人Schema),
  选举热度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  备注: z.string().describe('选举的特殊情况说明'),

  // ── 正常首相指名模式特有字段 ──
  执政党推荐候选人: z.string().optional().describe('【正常模式】执政党推荐的候选人姓名，特别大选模式下为空'),
  在野党联合候选人: z.string().optional().describe('【正常模式】在野党联合提名的候选人姓名，特别大选模式下为空'),
  议会各党派议席分布: z
    .array(
      z.object({
        党派: z.string(),
        众议院议席: z.coerce.number(),
        参议院议席: z.coerce.number(),
        倾向: z.string().describe('各党派当前对选举的倾向'),
      }),
    )
    .optional()
    .describe('【正常模式】议会内各党派的议席分布情况'),

  // ── 2039特别大选模式特有字段 ──
  青少年参选人比例: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .optional()
    .describe('【特别大选】12-18岁参选人占全部候选人的百分比，反映「互联网恶搞参选」的程度'),
  互联网恶搞热度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .optional()
    .describe('【特别大选】社交媒体上对选举的恶搞/娱乐化程度'),
  外部势力操纵痕迹: z.string().optional().describe('【特别大选】外部势力是否在操纵互联网投票'),
});

// ─── 副大臣子Schema ─────────────────────────────────────────
// 副大臣是阁僚与事务次官之间的中间层，
// 既是政治任命又需要与官僚体系合作，是权力博弈的关键缓冲

const 副大臣Schema = z.object({
  姓名: z.string(),
  年龄: z.coerce.number(),
  原身份: z.string().describe('就任前的身份'),

  // 任命背景
  任命方式: z.enum(副大臣任命方式列表),
  任命者: z.string().describe('实际决定其任命的人或势力'),
  所属派系: z.string().describe('其政治归属的派系'),

  // 政治能力
  政治立场: z.string().describe('副大臣的政治立场'),
  对职务理解度: z.enum(对职务理解度列表),
  实际履职状态: z.enum(实际履职状态列表),

  // 双向关系：阁僚 vs 官僚
  对阁僚态度: z.enum(副大臣对阁僚态度列表),
  对官僚态度: z.enum(副大臣对官僚态度列表),
  实际效忠对象: z.string().describe('真正听命于谁'),

  // 在省厅中的实际作用
  对省厅日常运作的介入度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('0=完全不管，100=事无巨细'),
  在阁僚与事务次官之间的角色: z.string().describe('传声筒/缓冲器/独立势力/傀儡'),

  // 个人状态
  对当前职位的态度: z.enum(对当前职位的态度列表),
  当前心理状态: z.string().describe('当前的心理状态'),
  更关心的事: z.string().describe('她心里真正在意的'),

  // 安全
  忠诚度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('对首相/内阁的忠诚度，0-100'),
  暗杀威胁等级: z.enum(暗杀威胁等级列表),
  人身安全状况: z.enum(人身安全状况列表),
});

// ─── 事务次官子Schema ─────────────────────────────────────────
// 事务次官是省厅事务方的一把手，官僚体系的真正掌权者
// 在2039年的设定中，事务次官会议可能已凌驾于内阁之上

const 事务次官Schema = z.object({
  姓名: z.string(),
  年龄: z.coerce.number(),
  出身省厅: z.string().describe('职业生涯的主要省厅背景'),
  出身派系: z.enum(事务次官出身派系列表).describe('本省内部的晋升路线/履历派系，而非跨省厅派系'),

  // 在事务次官会议中的地位
  在事务次官会议中的角色: z.string().describe('领袖/核心成员/边缘/新人/异端'),
  事务次官会议内盟友: z.string().describe('在事务次官会议中的盟友省厅/人物'),
  事务次官会议内对手: z.string().describe('在事务次官会议中的对手省厅/人物'),

  // 对阁僚的态度与策略
  对阁僚态度: z.enum(事务次官对阁僚态度列表),
  架空阁僚的方式: z.string().describe('如何架空/控制/配合阁僚'),
  对副大臣态度: z.string().describe('将副大臣视为盟友/对手/棋子/缓冲'),

  // 实际权力
  实权程度: z.enum(事务次官实权程度列表),
  对省厅日常运作的掌控度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('0=被阁僚压制，100=完全掌控省厅日常'),
  对政策制定的影响力: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('0=只能执行，100=政策由其制定'),

  // 更替与稳定性
  更替方式: z.enum(事务次官更替方式列表),
  在位时间: z.string().describe('已担任事务次官的时间'),
  继任者: z.string().describe('潜在的继任者姓名及背景'),

  // 外部关系
  与外部势力的联系: z.string().describe('与CSAT/美国/极道/大企业等的关系'),
  个人利益: z.string().describe('其个人或家族的核心利益'),

  // 个人状态
  当前策略: z.string().describe('当前的核心策略'),
  当前心理状态: z.string().describe('当前的心理状态'),
  更关心的事: z.string().describe('她心里真正在意的'),
});

// ─── 各省厅子Schema ───────────────────────────────────────

const 各省厅Schema = z.object({
  运作状态: z.enum(省厅运作状态列表),

  // ── 人事三巨头 ──
  大臣: z.string().describe('该省厅的大臣姓名，对应本届内阁.主要阁僚中的记录'),
  副大臣: 副大臣Schema,
  事务次官: 事务次官Schema,

  // ── 权力博弈 ──
  事务次官会议掌控度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('事务次官会议/官僚体系对该省厅实际运作的掌控程度，0-100'),
  内阁掌控度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('阁僚对该省厅的实质驱动力，0-100'),
  阁僚与官僚的权力平衡: z.string().describe('当前该省厅内阁僚与官僚体系的权力格局描述'),

  // ── 外部倾向 ──
  对CSAT态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  对美态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  倾向派系: z.string().describe('该省厅在事务次官会议中倾向于哪个派系'),

  // ── 组织结构 ──
  主要下属局厅: z.array(z.string()).describe('当前活跃的下属局厅'),
  当前焦点: z.string().describe('该省厅当前最重要的1-2件事'),
});

// ─── 事务次官会议内部派系子Schema ─────────────────────────

const 事务次官会议内部派系Schema = z.object({
  代表省厅: z.string().describe('该派系主导的省厅'),
  核心人物: z.string().describe('派系领袖姓名'),
  政治倾向: z.enum(派系政治倾向列表),
  对内阁态度: z.enum(对内阁态度列表),
  实力权重: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  当前策略: z.string().describe('当前策略'),
  与哪些外部势力有联系: z.string().describe('与外部势力的联系'),
});

// ─── 已决议事项子Schema ───────────────────────────────────

const 已决议事项Schema = z.object({
  事项: z.string(),
  决议结果: z.string(),
  执行状态: z.enum(已决议事项执行状态列表),
});

// ─── 事务次官会议子Schema ─────────────────────────────────

const 事务次官会议Schema = z.object({
  当前状态: z.enum(事务次官会议状态列表),
  实际权力等级: z.enum(事务次官会议权力等级列表),
  召集人: z.string().describe('当前最高级别的主持官员'),

  // 内部派系
  内部派系: z.record(z.string().describe('派系名'), 事务次官会议内部派系Schema),

  // 决策机制
  决策方式: z.enum(事务次官会议决策方式列表),
  当前焦点议题: z.string(),
  已决议事项: z.array(已决议事项Schema).max(5),

  // 与权力的明争暗斗
  与内阁的关系: z.enum(与内阁的关系列表),
  内阁对事务次官会议的态度: z.enum(内阁对事务次官会议的态度列表),
  首相官邸渗透程度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  与议会的关系: z.enum(与议会的关系列表),
  议会制约力: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  与司法的关系: z.enum(与司法的关系列表),
  地检署态度: z.enum(地检署态度列表),

  与CSAT的关系: z.enum(与CSAT的关系列表),
  CSAT渗透程度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  与美国CIA的关系: z.enum(与美国CIA的关系列表),
  美国残余影响力: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  // 利益集团
  与农协的关系: z.enum(与农协的关系列表),
  与极道的关系: z.enum(与极道的关系列表),
  与大企业的关系: z.enum(与大企业的关系列表),

  // 综合评价
  对CSAT态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  对美态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  凝聚力: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  对局势掌控力: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  合法性: z.enum(事务次官会议合法性列表),
});

// ─── 政治势力子Schema ─────────────────────────────────────

const 政治势力Schema = z.object({
  势力名: z.string(),
  类型: z.enum(['政党', '武装团体', '官僚系统', '灰色势力', '地方豪强', '外部势力代理人', '民间团体']),
  政治光谱: z.string().describe('政治光谱位置'),
  核心诉求: z.string(),
  对CSAT态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  对美态度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
  当前策略: z.string().describe('当前策略'),
  支持度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  武装力量等级: z.enum(['无', '极低', '低', '中等', '高', '极高']),
});

// ─── 日本执政（顶层模块） ─────────────────────────────────

export const 日本执政Schema = z.object({
  首相状态: z.enum(首相状态列表),
  首相姓名: z.string(),
  本届内阁: 本届内阁Schema,
  选举进程: 选举进程Schema,
  事务次官会议: 事务次官会议Schema,
  主要政治势力: z.record(z.string().describe('势力名'), 政治势力Schema),
  各省厅: z.record(z.string().describe('省厅名'), 各省厅Schema),
  当前政策: z.record(z.string().describe('政策名'), 政策Schema),
});

// ============================================================
// 三、日本国内情势模块（经济民生 + 社会秩序合并）
// ============================================================

const 区域分化Schema = z.object({
  区域: z.string(),
  特征: z.string().describe('区域特征描述'),
});

export const 日本国内情势Schema = z.object({
  // 金融与货币
  日元贬值趋势: z.enum(日元贬值趋势列表),
  货币信任度: z.enum(货币信任度列表),
  CSDC接受度: z.enum(CSDC接受度列表),

  // 物价与民生
  通胀等级: z.enum(通胀等级列表),
  大米价格倍数: z.coerce.number().describe('以2036年为基准×倍率'),
  失业率: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  // 粮食与能源
  粮食供应等级: z.enum(粮食供应等级列表),
  走私粮食占比: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  能源供应等级: z.enum(能源供应等级列表),
  停电状况: z.enum(停电状况列表),

  // 关键利益集团
  农协状态: z.enum(农协状态列表),
  农协与走私粮对抗: z.enum(农协与走私粮对抗列表),
  极道影响力: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  极道动态: z.string().describe('极道组织的关键变化'),
  自警团活跃度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  自警团武装化程度: z.enum(自警团武装化程度列表),

  // 社会安全网
  生命维持餐运作状态: z.enum(生命维持餐运作状态列表),
  生命维持餐依赖趋势: z.enum(生命维持餐依赖趋势列表),

  // 教育与娱乐
  教育状况: z.enum(教育状况列表),
  娱乐产业景气度: z.enum(娱乐产业景气度列表),
  LiveHouse运营状态: z.enum(LiveHouse运营状态列表),
  娱乐产业外部渗透: z.enum(娱乐产业外部渗透列表),

  // 治安与执法
  治安等级: z.enum(治安等级列表),
  治安恶劣区域: z.array(z.string()).max(5),
  夜间治安: z.enum(夜间治安列表),
  警察士气: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  警察腐败程度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),

  // 人口与住房
  富裕阶层外流: z.enum(富裕阶层外流列表),
  无家可归者: z.enum(无家可归者列表),

  // 基础设施与医疗
  基础设施维护: z.enum(基础设施维护列表),
  互联网状况: z.enum(互联网状况列表),
  医疗供应等级: z.enum(医疗供应等级列表),

  // 区域分化与社会心理
  区域分化: z.array(区域分化Schema).max(6),
  民众心态: z.string().describe('社会心态的分裂状态'),
  对外来势力的态度: z.string().describe('不同地域对外来势力的态度'),
  年轻人出路分化: z.array(z.enum(年轻人出路分化列表)),
});

// ============================================================
// 四、国际势力动态模块（按势力索引）
// ============================================================

const 国际势力Schema = z.object({
  对日策略倾向: z.enum(对日策略倾向列表),
  对日当前目标: z.string().describe('当前最想在日本达成的目标'),
  对日本政府态度: z.enum(对日本政府态度列表),
  对特别大选态度: z.enum(对特别大选态度列表),

  在日行动能力: z.enum(在日行动能力列表),
  在日情报网络: z.enum(在日情报网络列表),
  近期在日行动: z.string().describe('近期在日行动及结果'),

  内部团结度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  内部矛盾: z.string().describe('对日问题上的内部分歧'),

  特有关注: z.string().describe('当前值得追踪的动态指标'),
});

export const 国际势力动态Schema = z.record(z.string().describe('势力名'), 国际势力Schema);

// ============================================================
// 五、舆论场模块（执政合法性的晴雨表）
// ============================================================

const 社会群体Schema = z.object({
  对政府态度: z.enum(社会群体对政府态度列表),
  反CSAT情绪: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  反美情绪: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
  核心关切: z.string().describe('该群体当前最关心的问题'),
  政治活跃度: z.coerce
    .number()
    .transform(v => _.clamp(v, 0, 100))
    .describe('政治活跃度，0-100'),
  动向: z.string().describe('该群体正在发生的变化趋势'),
});

export const 舆论场Schema = z.object({
  社交媒体热点: z.array(z.string().describe('当前热门话题标签')),
  互联网直选风向: z.string().describe('当前网民整体情绪基调'),
  主流媒体立场: z.enum(主流媒体立场列表),
  社会群体: z.record(z.string().describe('群体名'), 社会群体Schema),
});

// ============================================================
// 六、各角色情况模块（群像追踪）
// ============================================================

const 角色情况Schema = z.object({
  姓名: z.string(),
  年龄: z.coerce.number(),
  所属团体: z.string().describe('所属的乐队/组织/机构'),
  身份: z.string().describe('角色身份'),

  政治卷入度: z.enum(政治卷入度列表),
  担任公职: z.string().describe('担任的公职'),
  卷入原因: z.string().describe('她是怎么被卷进来的'),

  所在地点: z.string(),
  当前活动: z.string().describe('当前正在做什么'),
  近期事务: z.string().describe('接下来要处理的事'),

  心理状态: z.string(),
  更关心的事: z.string().describe('她真正在意的'),

  经济状况: z.enum(经济状况列表),
  经济压力描述: z.string(),

  人身安全: z.enum(人身安全列表),
  威胁来源: z.string(),
  安保情况: z.string(),

  关系动态: z.string().describe('与其他角色的关键互动变化'),
  所属团体动态: z.string().describe('她所在团体/家庭的整体状态变化'),
  个人剧情线: z.string().describe('当前的故事弧线标签'),
});

export const 各角色情况Schema = z.record(z.string().describe('角色姓名'), 角色情况Schema);

// ============================================================
// 七、事件队列模块（事件驱动引擎）
// ============================================================

const 近期事件Schema = z.object({
  事件: z.string(),
  时间: z.string(),
  影响: z.string().describe('对局势的简要影响'),
});

const 潜在危机Schema = z.object({
  危机: z.string(),
  触发条件: z.string().describe('什么情况下可能爆发'),
  严重程度: z.enum(危机严重程度列表),
});

export const 事件队列Schema = z.object({
  近期已发生事件: z.array(近期事件Schema).transform(data => _.takeRight(data, 5)),
  潜在危机: z.array(潜在危机Schema).transform(data => _.takeRight(data, 5)),
});

// ============================================================
// 主Schema（合并7个顶层模块）
// ============================================================

export const Schema = z
  .object({
    世界: 世界Schema,
    日本执政: 日本执政Schema,
    日本国内情势: 日本国内情势Schema,
    国际势力动态: 国际势力动态Schema,
    舆论场: 舆论场Schema,
    各角色情况: 各角色情况Schema,
    事件队列: 事件队列Schema,
  })
  .transform(deriveAll);
