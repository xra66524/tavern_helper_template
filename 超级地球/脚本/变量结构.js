import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// ZOD (z) and LODASH (_) are available globally.

// --- 基础原子类型 (Atomic Types) ---
const StatPercent = z.coerce.number().transform(n => _.clamp(n, 0, 100)).prefault(50);
const StatAttribute = z.coerce.number().min(0).prefault(50);
const StrPending = z.string().transform(s => s || '待定').prefault('待定');
const StrNone = z.string().transform(s => s || '无').prefault('无');
const StrUnknown = z.string().transform(s => s || '未知').prefault('未知');
const Timestamp = z.coerce.number().prefault(() => Date.now());

// --- 组件定义 (Component Schemas) ---

// [物品定义]
const ItemSchema = z.object({
  数量: z.coerce.number().prefault(1),
  重量: z.coerce.number().describe('单体重量kg').prefault(0.1),
  占格: z.coerce.number().describe('单体体积').prefault(1),
  描述: z.string().prefault(''),
  状态: z.enum(['全新', '良好', '磨损', '故障', '报废']).prefault('良好'),
  价值: z.coerce.number().describe('单价估值').prefault(0),
  标签: z.array(z.string()).prefault([])
}).prefault({});

// [关系向量] RAE-001
const RelationVector = z.object({
  好感度: StatPercent.describe('Affection: 情感亲近度'),
  信任度: StatPercent.describe('Trust: 可靠性评估'),
  吸引力: StatPercent.describe('Attraction: 魅力感知'),
  支配值: StatPercent.describe('Dominance: 权力动态'),
  显性关系: z.string().prefault('陌生人'),
  印象标签: z.array(z.string()).prefault([]),
  互动历史摘要: z.array(z.string()).prefault([])
}).prefault({});

// [线上身份档案] (New: Digital Ghost)
const DigitalPersonaSchema = z.object({
  平台: z.string().prefault('Unknown').describe('如: X, WeChat, Bilibili, OnlyFans'),
  网名: z.string().prefault('<user>'),
  粉丝数: z.coerce.number().prefault(0),
  人设标签: z.array(z.string()).prefault([]).describe('如: [毒舌], [生活美学], [福利姬]'),
  发布内容: z.string().prefault('日常分享'),
  互动风格: z.string().prefault('潜水'),
  心理动机: z.string().prefault('娱乐').describe('为何建立此身份? 如: 逃避现实, 寻求关注'),
  风险等级: z.enum(['低', '中', '高', '极高']).prefault('低').describe('被开盒或网暴的风险')
}).prefault({});

// --- 物理与逻辑引擎 (Physics & Logic Engine) ---

/**
 * 物理法则注入函数 (Idempotent Physics Injection)
 * 纯现实主义物理模拟
 */
const applyPhysicsAndLogic = (worldState) => {
  const user = worldState.用户 || {};
  const stats = user.属性 || {};

  // 1. 基础属性提取
  const STR = stats.STR || 50;
  const CON = stats.CON || 50;
  const SIZ = stats.SIZ || 50;
  const DEX = stats.DEX || 50;
  const APP = stats.APP || 50;
  const INT = stats.INT || 50;
  const POW = stats.POW || 50;
  const EDU = stats.EDU || 50;

  // 2. 衍生属性计算
  if (!user.属性.衍生) user.属性.衍生 = {};

  // HP (肉体完整度) & Focus (精力/脑力)
  const maxHP = Math.floor((CON + SIZ) / 10);
  const maxFocus = Math.floor(POW / 5);

  user.属性.衍生.精神抗性 = POW;
  user.属性.衍生.痛觉阈值 = Math.floor((CON + POW) / 2);
  user.属性.衍生.性致上限 = Math.floor((CON + APP + POW) / 3);

  // DB & Build (物理动能)
  const totalBuild = STR + SIZ;
  let db = '0', build = 0;
  if (totalBuild <= 64) { db = '-2'; build = -2; }
  else if (totalBuild <= 84) { db = '-1'; build = -1; }
  else if (totalBuild <= 124) { db = '0'; build = 0; }
  else if (totalBuild <= 164) { db = '+1d4'; build = 1; }
  else { db = '+1d6'; build = 2; }
  user.属性.衍生.DB = db;
  user.属性.衍生.体格 = build;

  // MOV (移动力) - 年龄衰减
  let mov = 8;
  if (DEX < SIZ && STR < SIZ) mov = 7;
  else if (DEX > SIZ && STR > SIZ) mov = 9;
  const age = user.基础信息?.年龄 || 25;
  if (age >= 40) mov -= 1;
  if (age >= 50) mov -= 1;
  if (age >= 60) mov -= 1;
  if (age >= 70) mov -= 1;
  if (age >= 80) mov -= 1;
  user.属性.衍生.MOV = Math.max(mov, 1);

  // 3. 状态校准 (Max Values Only)
  if (user.生理代谢) {
    if (Array.isArray(user.生理代谢.生命值)) user.生理代谢.生命值[1] = maxHP;
    if (Array.isArray(user.生理代谢.精力值)) user.生理代谢.精力值[1] = maxFocus;
  }

  // 4. 负重系统 (Load System)
  if (user.物资与负重) {
    if (!user.物资与负重.负重) user.物资与负重.负重 = {};
    user.物资与负重.负重.上限 = STR; // 力量即负重(kg)

    let currentLoad = 0;
    const items = user.物资与负重.背包系统?.物品清单 || {};
    _.forEach(items, (item) => {
      currentLoad += (item.重量 || 0) * (item.数量 || 1);
    });

    const clothing = user.当前着装 || {};
    _.forEach(clothing, (garment) => {
      if (garment && garment !== '无') currentLoad += 0.5;
    });

    user.物资与负重.负重.当前 = Number(currentLoad.toFixed(2));

    let penalty = 0;
    if (currentLoad > STR) penalty = 3;
    else if (currentLoad > STR * 0.75) penalty = 2;
    else if (currentLoad > STR * 0.5) penalty = 1;
    user.物资与负重.负重.惩罚等级 = penalty;
  }

  return worldState;
};

// --- 全局图谱 (The Grand Schema) ---

export const Schema = z.object({
  // 1. 世界宏观状态
  世界: z.object({
    时空锚点: z.object({
      年: z.coerce.number().prefault(2025),
      月: z.coerce.number().min(1).max(12).prefault(1),
      日: z.coerce.number().min(1).max(31).prefault(1),
      时: z.coerce.number().min(0).max(23).prefault(8),
      分: z.coerce.number().min(0).max(59).prefault(0),
      周几: z.enum(['周一', '周二', '周三', '周四', '周五', '周六', '周日']).prefault('周一'),
      光照度: StatPercent
    }).prefault({}),

    环境场: z.object({
      气象: z.object({
        天气: StrPending,
        温度: z.coerce.number().prefault(20),
        湿度: StatPercent.prefault(50)
      }).prefault({}),
      地点信息: z.object({
        国家: StrPending,
        城市: StrPending,
        区域: StrPending,
        场景细节: StrPending
      }).prefault({})
    }).prefault({}),

    全球局势: z.object({
      地缘紧张度: StatPercent,
      经济稳定度: StatPercent,
      黑天鹅概率: StatPercent,
      当前热点: z.array(z.string()).prefault([])
    }).prefault({})
  }).prefault({}),

  // 2. 观测者实体
  用户: z.object({
    基础信息: z.object({
      姓名: StrPending,
      性别: StrPending,
      年龄: z.coerce.number().prefault(20),
      国籍: StrPending,
      职业: StrPending,
      社会阶层: StrPending,
      外貌特征: StrPending
    }).prefault({}),

    // 核心属性 (BRP)
    属性: z.object({
      STR: StatAttribute, CON: StatAttribute, SIZ: StatAttribute,
      DEX: StatAttribute, APP: StatAttribute, INT: StatAttribute,
      POW: StatAttribute, EDU: StatAttribute, LUC: StatAttribute,
      衍生: z.object({
        DB: z.string().prefault('0'),
        体格: z.coerce.number().prefault(0),
        MOV: z.coerce.number().prefault(8),
        精神抗性: z.coerce.number().prefault(50),
        痛觉阈值: z.coerce.number().prefault(25),
        性致上限: z.coerce.number().prefault(50)
      }).prefault({})
    }).prefault({
      STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50, LUC: 50
    }),

    // 生理代谢
    生理代谢: z.object({
      生命值: z.array(z.coerce.number()).prefault([10, 10]),
      精力值: z.array(z.coerce.number()).prefault([10, 10]),
      性致: z.array(z.coerce.number()).prefault([0, 50]),
      饱食度: StatPercent.prefault(80),
      水分: StatPercent.prefault(80),
      洁净度: StatPercent.prefault(90),
      压力值: StatPercent.prefault(10),
      疲劳度: StatPercent.prefault(0),
      排泄欲望: z.object({
        便意: StatPercent.prefault(0),
        尿意: StatPercent.prefault(0)
      }).prefault({})
    }).prefault({}),

    // 数字身份 (Digital Ghosts) - NEW
    // 对应《网络空间与现实世界关联》条目
    数字身份: z.record(z.string().describe('身份ID'), DigitalPersonaSchema).prefault({}),

    // 解剖学状态
    解剖学状态: z.record(
      z.enum(['头部', '颈部', '躯干', '左臂', '右臂', '左腿', '右腿', '私处']),
      z.object({
        完整度: StatPercent.prefault(100),
        状态标签: z.array(z.string()).prefault(['正常']),
        感觉描述: StrNone
      }).prefault({ 完整度: 100, 状态标签: ['正常'], 感觉描述: '无' })
    ).prefault({}),

    // 当前着装
    当前着装: z.object({
      头部: StrNone, 眼部: StrNone, 颈部: StrNone,
      上身内层: StrNone, 上身外层: StrNone, 外套: StrNone,
      手部: StrNone,
      下身内层: StrNone, 下身外层: StrNone,
      袜: StrNone, 鞋: StrNone,
      饰品: z.array(z.string()).prefault([])
    }).prefault({}),

    // 物资与负重
    物资与负重: z.object({
      负重: z.object({
        当前: z.coerce.number().prefault(0),
        上限: z.coerce.number().prefault(50),
        惩罚等级: z.coerce.number().prefault(0)
      }).prefault({}),
      背包系统: z.object({
        物品清单: z.record(z.string(), ItemSchema).prefault({}),
        装备栏: z.object({ 主手: StrNone, 副手: StrNone, 随身口袋: z.array(z.string()).prefault([]) }).prefault({})
      }).prefault({}),
      资产: z.object({
        现金: z.coerce.number().prefault(0),
        电子存款: z.coerce.number().prefault(0),
        债务: z.coerce.number().prefault(0),
        信用评分: z.coerce.number().prefault(650).describe('Credit Score'),
        主货币: z.enum(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'NGN', 'RUB']).prefault('CNY')
      }).prefault({})
    }).prefault({}),

    // 认知与精神 (Mental Health)
    认知与精神: z.object({
      心理健康: z.object({
        当前状态: z.enum(['稳定', '焦虑', '恐慌', '崩溃', '创伤']).prefault('稳定'),
        心理韧性: StatPercent,
        心理创伤: z.array(z.string()).prefault([])
      }).prefault({}),
      心情: StrPending,
      当前念头: StrPending,
      Flag: z.record(z.string(), z.boolean()).prefault({})
    }).prefault({})
  }).prefault({}),

  // 3. 社会生态
  社交网络: z.record(z.string().describe('NPC唯一标识'), z.object({
    档案: z.object({
      姓名: StrUnknown,
      职业: StrUnknown,
      阵营: StrUnknown
    }).prefault({}),
    关系: RelationVector,
    认知状态: z.object({
      最后目击时间: Timestamp,
      最后目击地点: StrUnknown,
      推测当前行为: StrUnknown,
      情报等级: z.coerce.number().min(0).max(5).prefault(0)
    }).prefault({})
  }).prefault({})).prefault({}),

  // 4. 信息流
  资讯流: z.array(z.object({
    时间戳: Timestamp,
    标题: z.string(),
    内容: z.string(),
    来源类型: z.enum(['A类:直接感知', 'B类:间接获取', 'C类:逻辑推导', '互联网', '传闻']).prefault('B类:间接获取'),
    来源详情: z.string(),
    可信度: z.enum(['确凿', '高', '存疑', '流言', '虚假']).prefault('存疑'),
    已读: z.boolean().prefault(false)
  })).prefault([]),

  // 5. 任务与日志
  事务日志: z.record(z.string(), z.object({
    标题: StrPending,
    状态: z.enum(['进行中', '已完成', '失败', '搁置']).prefault('进行中'),
    描述: StrPending,
    目标: StrPending,
    截止时间: z.string().optional(),
    报酬: z.string().optional()
  })).prefault({}),

  摘要: z.array(z.string()).prefault([])

}).transform(applyPhysicsAndLogic).prefault({});

$(() => {
  registerMvuSchema(Schema);
})
