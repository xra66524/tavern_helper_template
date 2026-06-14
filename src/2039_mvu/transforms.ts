// ============================================================
// src/2039_mvu/transforms.ts
// 可复用的 .transform() 派生计算函数
// 用于 Schema 中自动推导出高层次的剧情提示标签
// ============================================================

// 运行期只读取部分字段；deriveAll 使用泛型保留 mvu_schema.ts 的完整输出结构，避免把所有字段推成可选。

interface RuntimeMvuData extends Record<string, any> {
  世界?: {
    当前日期?: string;
    当前时间?: string;
    政治阶段?: string;
    选举模式?: string;
    当前大事件?: string;
  };
  日本执政?: {
    首相状态?: string;
    首相姓名?: string;
    本届内阁?: {
      届数?: number;
      首相政治立场?: string;
      执政联盟?: string[];
      内阁稳定度?: number;
      主要阁僚?: Record<
        string,
        {
          姓名?: string;
          暗杀威胁等级?: string;
          人身安全状况?: string;
          [key: string]: any;
        }
      >;
    };
    选举进程?: {
      类型?: string;
      阶段?: string;
      候选人排名?: any[];
      选举热度?: number;
      备注?: string;
    };
    事务次官会议?: {
      实际权力等级?: string;
      合法性?: string;
      [key: string]: any;
    };
    各省厅?: Record<string, { 内阁掌控度?: number; [key: string]: any }>;
    当前政策?: Record<string, any>;
    主要政治势力?: Record<string, any>;
  };
  日本国内情势?: {
    治安等级?: string;
    通胀等级?: string;
    粮食供应等级?: string;
    [key: string]: any;
  };
  国际势力动态?: Record<
    string,
    {
      对日策略倾向?: string;
      对日本政府态度?: string;
      在日行动能力?: string;
      [key: string]: any;
    }
  >;
  舆论场?: {
    主流媒体立场?: string;
    社交媒体热点?: string[];
    [key: string]: any;
  };
  各角色情况?: Record<
    string,
    {
      担任公职?: string;
      政治卷入度?: string;
      人身安全?: string;
      [key: string]: any;
    }
  >;
  事件队列?: {
    近期已发生事件?: Array<{ 事件?: string; 时间?: string; 影响?: string }>;
    潜在危机?: Array<{ 危机?: string; 触发条件?: string; 严重程度?: string }>;
  };
}

// ─── $执政合法性 ────────────────────────────────────────────

/** 由 首相状态 + 选举进程 + 主流媒体立场 + 内阁稳定度 综合推导 */
export function derive执政合法性(data: RuntimeMvuData): '合法执政' | '争议执政' | '合法性危机' | '非法执政' {
  const 首相 = data.日本执政?.首相状态;
  const 选举阶段 = data.日本执政?.选举进程?.阶段;
  const 选举类型 = data.日本执政?.选举进程?.类型;
  const 媒体 = data.舆论场?.主流媒体立场;
  const 稳定度 = data.日本执政?.本届内阁?.内阁稳定度 ?? 0;
  const 事务次官会议合法性 = data.日本执政?.事务次官会议?.合法性;

  // 非法执政条件：首相空位 + 无选举进行中
  if (首相 === '空位' && 选举类型 === '无') return '非法执政';
  if (事务次官会议合法性 === '非法') return '非法执政';

  // 合法性危机：看守状态 + 稳定度低
  if (首相 === '看守' && 稳定度 < 30) return '合法性危机';
  if (媒体 === '噤声' && 稳定度 < 50) return '合法性危机';
  if (选举阶段 === '无人愿意出任首相') return '合法性危机';

  // 争议执政：看守、媒体分裂、稳定度中等
  if (首相 === '看守') return '争议执政';
  if (媒体 === '分裂' || 媒体 === '批判') return '争议执政';
  if (稳定度 < 50) return '争议执政';

  return '合法执政';
}

// ─── $政府控制力 ────────────────────────────────────────────

/** 由 事务次官会议实际权力等级 + 各省厅内阁掌控度（均值）+ 内阁稳定度 综合推导 */
export function derive政府控制力(data: RuntimeMvuData): '完全控制' | '有效治理' | '勉强维持' | '半瘫痪' | '停摆' {
  const 权力等级 = data.日本执政?.事务次官会议?.实际权力等级;
  const 各省厅 = data.日本执政?.各省厅 ?? {};
  const 稳定度 = data.日本执政?.本届内阁?.内阁稳定度 ?? 0;
  const 首相状态 = data.日本执政?.首相状态;

  // 停摆条件
  if (首相状态 === '空位') return '停摆';
  if (权力等级 === '完全替代内阁' && 稳定度 < 20) return '停摆';

  // 半瘫痪
  const 内阁掌控度List = Object.values(各省厅).map((s: { 内阁掌控度?: number }) => s.内阁掌控度 ?? 0);
  const 平均内阁掌控度 =
    内阁掌控度List.length > 0 ? 内阁掌控度List.reduce((a, b) => a + b, 0) / 内阁掌控度List.length : 0;

  if (权力等级 === '主导政府运作' && 平均内阁掌控度 < 20) return '半瘫痪';
  if (稳定度 < 20) return '半瘫痪';

  // 勉强维持
  if (权力等级 === '主导政府运作') return '勉强维持';
  if (平均内阁掌控度 < 50) return '勉强维持';
  if (稳定度 < 50) return '勉强维持';

  // 有效治理
  if (平均内阁掌控度 < 70 || 稳定度 < 70) return '有效治理';

  return '完全控制';
}

// ─── $整体危机等级 ──────────────────────────────────────────

/** 由 治安等级 + 通胀等级 + 政治阶段 + 粮食供应 + 能源供应 + 潜在危机 综合推导 */
export function derive整体危机等级(data: RuntimeMvuData): '正常' | '注意' | '警戒' | '严重' | '危急' {
  const 治安 = data.日本国内情势?.治安等级;
  const 通胀 = data.日本国内情势?.通胀等级;
  const 政治阶段 = data.世界?.政治阶段;
  const 粮食 = data.日本国内情势?.粮食供应等级;
  const 能源 = data.日本国内情势?.能源供应等级;
  const 潜在危机 = data.事件队列?.潜在危机 ?? [];

  // 计分
  let score = 0;

  // 治安维度（0-4）
  if (治安 === '无政府状态') score += 4;
  else if (治安 === '失控') score += 3;
  else if (治安 === '严峻') score += 2;
  else if (治安 === '恶化') score += 1;

  // 通胀维度（0-4）
  if (通胀 === '货币崩溃') score += 4;
  else if (通胀 === '恶性通胀') score += 3;
  else if (通胀 === '严重通胀') score += 2;
  else if (通胀 === '温和通胀') score += 1;

  // 政治维度（0-3）
  if (政治阶段 === '遇刺潮末期' || 政治阶段 === '看守停摆期') score += 3;

  // 粮食维度（0-4）
  if (粮食 === '饥荒边缘') score += 4;
  else if (粮食 === '黑市依赖') score += 3;
  else if (粮食 === '危机') score += 2;
  else if (粮食 === '紧缺') score += 1;

  // 能源维度（0-3）
  if (能源 === '崩溃') score += 3;
  else if (能源 === '严重短缺') score += 2;
  else if (能源 === '计划停电') score += 1;

  // 潜在危机
  const 极高危机 = 潜在危机.filter((c: { 严重程度?: string }) => c.严重程度 === '极高').length;
  const 高危机 = 潜在危机.filter((c: { 严重程度?: string }) => c.严重程度 === '高').length;
  score += 极高危机 * 2 + 高危机;

  // 映射
  if (score >= 14) return '危急';
  if (score >= 9) return '严重';
  if (score >= 5) return '警戒';
  if (score >= 2) return '注意';
  return '正常';
}

// ─── $当前剧情焦点 ──────────────────────────────────────────

/** 根据 政治阶段 + 大事件 + 选举进程 + 各角色情况 自动生成一句话提示 */
export function derive当前剧情焦点(data: RuntimeMvuData): string {
  const 政治阶段 = data.世界?.政治阶段;
  const 大事件 = data.世界?.当前大事件;
  const 选举阶段 = data.日本执政?.选举进程?.阶段;
  const 选举类型 = data.日本执政?.选举进程?.类型;

  // 遇刺潮期间
  if (政治阶段 === '遇刺潮末期') {
    return `遇刺潮仍在持续，${大事件 || '政治暗杀频发，无人敢出任首相'}`;
  }

  // 看守停摆
  if (政治阶段 === '看守停摆期') {
    return `内阁停摆中，${大事件 || '事务次官会议实际掌权，社会秩序加速恶化'}`;
  }

  // 特别大选
  if (选举类型 === '2039特别大选') {
    if (选举阶段?.includes('报名')) return '特别大选报名进行中，互联网上恶搞与严肃参选并存';
    if (选举阶段?.includes('初选')) return '特别大选互联网初选中，全民投票筛选候选人';
    if (选举阶段?.includes('指名')) return '特别大选进入议会最终指名投票阶段';
    return `2039特别大选中：${选举阶段 || '进行中'}`;
  }

  // 正常选举
  if (政治阶段 === '正常选举期') {
    if (选举阶段?.includes('党首')) return '执政党党首选举进行中，各派系角力激烈';
    if (选举阶段?.includes('议会')) return '议会首相指名投票进行中';
    return `选举进行中：${选举阶段 || '政治博弈'}`;
  }

  // 执政期
  if (政治阶段 === '新内阁执政期') {
    return `新内阁执政中，${大事件 || '面临经济崩溃与外部压力的双重考验'}`;
  }

  return 大事件 || '政局混沌中';
}

// ─── $外部压力指数 ──────────────────────────────────────────

/** 由 国际势力动态 中各势力的行动能力 + 对日策略 综合推导 */
export function derive外部压力指数(data: RuntimeMvuData): '低' | '中' | '高' | '极高' {
  const 势力: Record<string, any> = data.国际势力动态 ?? {};

  let score = 0;

  for (const s of Object.values(势力)) {
    // 在日行动能力计分
    switch (s.在日行动能力) {
      case '极高':
        score += 5;
        break;
      case '高':
        score += 4;
        break;
      case '中等':
        score += 3;
        break;
      case '低':
        score += 2;
        break;
      case '极低':
        score += 1;
        break;
    }

    // 策略倾向加成
    if (s.对日策略倾向 === '积极扩张' || s.对日策略倾向 === '对抗遏制') score += 2;
    if (s.对日策略倾向 === '暗中渗透') score += 1;

    // 对政府态度
    if (s.对日本政府态度 === '敌对') score += 2;
    if (s.对日本政府态度 === '暗中操控') score += 1;
  }

  if (score >= 20) return '极高';
  if (score >= 12) return '高';
  if (score >= 6) return '中';
  return '低';
}

// ============================================================
// 组合 transform：一次性生成所有派生字段
// ============================================================

/** 在 Schema.transform() 中调用，一次生成所有 $ 前缀的派生字段 */
export function deriveAll<T extends RuntimeMvuData>(data: T) {
  return {
    ...data,
    $执政合法性: derive执政合法性(data),
    $政府控制力: derive政府控制力(data),
    $整体危机等级: derive整体危机等级(data),
    $当前剧情焦点: derive当前剧情焦点(data),
    $外部压力指数: derive外部压力指数(data),
  };
}
