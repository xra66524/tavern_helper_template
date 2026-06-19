// ============================================================
// 群友群穿/transforms.ts
// 派生字段：生成 $ 前缀只读提示标签
// ============================================================

interface RuntimeMvuData extends Record<string, any> {
  世界?: {
    政治阶段?: string;
    当前大事件?: string;
    当前日期?: string;
    当前时间?: string;
  };
  组织结构?: {
    当前最高权力机构?: string;
    当前决策核心?: string;
    当前监督机构?: string;
    机构?: Record<
      string,
      {
        一把手?: string;
        二把手?: string;
        权势指数?: number;
        运作状态?: string;
        实有人数?: number;
        制度详情?: {
          领导体制?: string;
        };
      }
    >;
    财政?: {
      收入来源?: Record<string, number>;
      主要支出?: Record<string, number>;
      财政状况?: string;
      审计机构?: string;
    };
    行政区划?: Record<
      string,
      {
        治安状况?: string;
        与中央关系?: string;
      }
    >;
  };
  科技树?: {
    主要研究槽?: Array<{ 节点名?: string; 研发进度?: number; 启动日期?: string }>;
    次要研究槽?: Array<{ 节点名?: string; 研发进度?: number; 启动日期?: string }>;
    已解锁能力清单?: string[];
  };
  群友角色?: Record<
    string,
    {
      人身安全?: string;
    }
  >;
  事件队列?: {
    近期已发生事件?: Array<{ 事件?: string; 时间?: string; 影响?: string }>;
    潜在危机?: Array<{ 危机?: string; 触发条件?: string; 严重程度?: string }>;
  };
}

export function derive当前剧情焦点(data: RuntimeMvuData): string {
  const 政治阶段 = data.世界?.政治阶段 || '阶段未明';
  const 当前大事件 = data.世界?.当前大事件 || '暂无明确大事件';
  const 最新事件 = _.last(data.事件队列?.近期已发生事件 ?? []);
  const 首要危机 = _.last(data.事件队列?.潜在危机 ?? []);

  const pieces = [`${政治阶段}：${当前大事件}`];
  if (最新事件?.事件) pieces.push(`最新事件：${最新事件.事件}`);
  if (首要危机?.危机) pieces.push(`潜在危机：${首要危机.危机}`);
  return pieces.join('；');
}

export function derive穿越者存活数(data: RuntimeMvuData): number {
  return Object.values(data.群友角色 ?? {}).filter(角色 => 角色?.人身安全 !== '已死亡').length;
}

const START_DATE = '1905-05-10';

export function derive穿越天数(data: RuntimeMvuData): number {
  const date = data.世界?.当前日期;
  if (!date) return 0;
  const start = new Date(START_DATE);
  const cur = new Date(date);
  const diff = Math.floor((cur.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export function derive财政健康度(data: RuntimeMvuData): string {
  const 财政 = data.组织结构?.财政;
  if (!财政) return '财政模块缺失';

  const 收入 = _.sum(Object.values(财政.收入来源 ?? {}).map(Number));
  const 支出 = _.sum(Object.values(财政.主要支出 ?? {}).map(Number));
  const 收支差额 = 收入 - 支出;
  const 审计机构 = 财政.审计机构;
  const 审计状态 = 审计机构 && 审计机构 !== '无' ? `审计：${审计机构}` : '无审计';

  if (财政.财政状况 === '破产') return `崩溃（${审计状态}，收支差额 ${收支差额}）`;
  if (财政.财政状况 === '赤字' || 收支差额 < 0)
    return `承压（${财政.财政状况 ?? '状态未明'}，${审计状态}，收支差额 ${收支差额}）`;
  if (审计机构 === '无') return `有隐患（${财政.财政状况 ?? '状态未明'}，无审计，收支差额 ${收支差额}）`;
  return `健康（${财政.财政状况 ?? '状态未明'}，${审计状态}，收支差额 ${收支差额}）`;
}

export function derive监督有效性(data: RuntimeMvuData): string {
  const 组织结构 = data.组织结构;
  const 监督机构名 = 组织结构?.当前监督机构;
  if (!监督机构名) return '尚未建立监督体系';
  if (监督机构名 === '无') return '无独立监督';

  const 监督机构 = 组织结构?.机构?.[监督机构名];
  if (!监督机构) return `监督机构 ${监督机构名} 不存在`;

  const 决策核心名 = 组织结构?.当前决策核心 || 组织结构?.当前最高权力机构;
  const 决策核心 = 决策核心名 ? 组织结构?.机构?.[决策核心名] : undefined;
  const 独立性 = 监督机构.一把手 && 决策核心?.一把手 && 监督机构.一把手 === 决策核心.一把手 ? '主官重合' : '主官分离';
  return `${监督机构名}：${监督机构.运作状态 ?? '状态未明'}，${独立性}`;
}

export function derive地方控制度(data: RuntimeMvuData): string {
  const 行政区划 = data.组织结构?.行政区划 ?? {};
  const 区划列表 = Object.values(行政区划);
  if (区划列表.length === 0) return '尚未建立行政区划';

  const 风险数 = 区划列表.filter(
    区划 => ['动荡', '失控'].includes(区划?.治安状况 ?? '') || ['阳奉阴违', '对抗'].includes(区划?.与中央关系 ?? ''),
  ).length;
  const 稳定数 = 区划列表.filter(
    区划 => ['稳固', '稳定'].includes(区划?.治安状况 ?? '') && 区划?.与中央关系 === '服从',
  ).length;
  return `稳定 ${稳定数}/${区划列表.length}，风险 ${风险数}/${区划列表.length}`;
}

export function derive制衡机制状态(data: RuntimeMvuData): string {
  const 机构表 = data.组织结构?.机构 ?? {};
  const 机构列表 = Object.values(机构表);
  if (机构列表.length === 0) return '无机构数据';

  const 双设数 = 机构列表.filter(
    机构 => 机构?.一把手 && 机构.一把手 !== '空缺' && 机构?.二把手 && 机构.二把手 !== '无',
  ).length;
  const 空缺数 = 机构列表.filter(机构 => 机构?.一把手 === '空缺').length;
  return `双设 ${双设数}/${机构列表.length}，主官空缺 ${空缺数}`;
}

export function deriveAll<T extends RuntimeMvuData>(data: T) {
  return {
    ...data,
    $当前剧情焦点: derive当前剧情焦点(data),
    $穿越者存活数: derive穿越者存活数(data),
    $穿越天数: derive穿越天数(data),
    $财政健康度: derive财政健康度(data),
    $监督有效性: derive监督有效性(data),
    $地方控制度: derive地方控制度(data),
    $制衡机制状态: derive制衡机制状态(data),
  };
}
