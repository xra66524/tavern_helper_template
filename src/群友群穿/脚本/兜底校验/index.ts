// ============================================================
// 群友群穿/脚本/兜底校验/index.ts
// VARIABLE_UPDATE_ENDED 兜底校验：阶段四 + 后期扩展包阶段 2
// ============================================================

// @ts-expect-error Node ESM schema dump 需要显式 .ts 扩展名，webpack 可正常解析
import { 科技树 } from '../../tech_tree.ts';

type AnyRecord = Record<string, any>;

const START_DATE = '1905-05-10';
const AMMO_ORDER = ['充足', '消耗过半', '紧张', '危急', '耗尽'];
const UNDERSTANDING_ORDER = ['一无所知', '听闻异事', '掌握部分情报', '深入了解', '完全掌握'];
const RELIABILITY_ORDER = ['可靠', '基本可靠', '待验证', '不可靠'];
const CORE_DEVICE_ORDER = ['正常', '降级', '故障', '损毁'];
const SAFETY_DEAD = '已死亡';

export function registerMvuFallbackGuards() {
  void (async () => {
    await waitGlobalInitialized('Mvu');
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables: any, variables_before: any) => {
      const data = variables.stat_data as unknown as AnyRecord;
      const before = (variables_before?.stat_data ?? {}) as unknown as AnyRecord;
      if (!data) return;

      ensureContainers(data);

      runCoreFallbacks(data, before);
      runExtensionFallbacks(data, before);
    });
  })();
}

function runCoreFallbacks(data: AnyRecord, before: AnyRecord) {
  const now = currentDateTime(data);

  reverseSync角色职务To机构(data, before);
  sync机构负责人And职务(data, before, now);
  enforceDeaths(data, before, now);
  sync政治阶段(data);
  enforce基地车AndMaterials(data, before);
  sync外部势力升级(data, before);
  sync历史大事件(data, before);
  sync军事模块(data, before, now);
  sync情报模块(data, before);
  sync科技树(data, before);
}

function runExtensionFallbacks(data: AnyRecord, before: AnyRecord) {
  ensure制度详情(data);
  validate党政双首长(data);
  validate条块关系(data);
  sync财政联动(data, before);
  sync人事任命(data, before);
  validate监督(data);
  validate领导小组(data);
}

function ensureContainers(data: AnyRecord) {
  _.defaultsDeep(data, {
    组织结构: { 机构: {}, 财政: {} },
    事件队列: { 近期已发生事件: [], 潜在危机: [] },
    群友角色: {},
    非群友角色: {},
    军事: { 部队: {}, 武器装备: {} },
    情报: { 对外情报网络: {} },
    外部势力: {},
    科技树: { 主要研究槽: [], 次要研究槽: [], 已解锁能力清单: [] },
    基地车: { 核心设备状态: {}, 物资储备: {} },
  });
}

function currentDateTime(data: AnyRecord): string {
  const date = _.get(data, '世界.当前日期', START_DATE);
  const time = _.get(data, '世界.当前时间', '00:00');
  return `${date} ${time}`;
}

function appendEvent(data: AnyRecord, event: string, impact = '状态联动', time = currentDateTime(data)) {
  const list = (_.get(data, '事件队列.近期已发生事件', []) ?? []) as AnyRecord[];
  if (list.some(item => item?.事件 === event)) return;
  list.push({ 事件: event, 时间: time, 影响: impact });
  _.set(data, '事件队列.近期已发生事件', _.takeRight(list, 8));
  console.info(`[群友群穿兜底] 追加事件：${event}`);
}

function appendCrisis(data: AnyRecord, crisis: string, condition: string, severity = '中') {
  const list = (_.get(data, '事件队列.潜在危机', []) ?? []) as AnyRecord[];
  if (list.some(item => item?.危机 === crisis)) return;
  list.push({ 危机: crisis, 触发条件: condition, 严重程度: severity });
  _.set(data, '事件队列.潜在危机', _.takeRight(list, 6));
  console.info(`[群友群穿兜底] 追加危机：${crisis}`);
}

function warn(message: string) {
  console.warn(`[群友群穿兜底] ${message}`);
}

function findRole(data: AnyRecord, name: string): { path: string[]; role: AnyRecord; isGroup: boolean } | undefined {
  if (!name || ['空缺', '无', '未知'].includes(name)) return undefined;
  const groupRole = _.get(data, ['群友角色', name]);
  if (groupRole) return { path: ['群友角色', name], role: groupRole, isGroup: true };
  const npcRole = _.get(data, ['非群友角色', name]);
  if (npcRole) return { path: ['非群友角色', name], role: npcRole, isGroup: false };
  return undefined;
}

function appendHistory(
  data: AnyRecord,
  name: string,
  event: string,
  source = '兜底脚本',
  time = currentDateTime(data),
) {
  const found = findRole(data, name);
  if (!found) return;
  const history = (_.get(data, [...found.path, '履历'], []) ?? []) as AnyRecord[];
  if (history.at(-1)?.事件 === event) return;
  history.push({ 时间: time, 事件: event, 来源: source });
  _.set(data, [...found.path, '履历'], _.takeRight(history, found.isGroup ? 8 : 5));
}

function walk机构(data: AnyRecord, cb: (name: string, inst: AnyRecord) => void) {
  const institutions = (_.get(data, '组织结构.机构', {}) ?? {}) as Record<string, AnyRecord>;
  for (const [name, inst] of Object.entries(institutions)) cb(name, inst);
}

function reverseSync角色职务To机构(data: AnyRecord, before: AnyRecord) {
  for (const roleRoot of ['群友角色', '非群友角色']) {
    const roles = (_.get(data, roleRoot, {}) ?? {}) as Record<string, AnyRecord>;
    const beforeRoles = (_.get(before, roleRoot, {}) ?? {}) as Record<string, AnyRecord>;
    for (const [roleName, role] of Object.entries(roles)) {
      const duty = String(role?.当前职务 ?? '');
      if (!duty || duty === beforeRoles[roleName]?.当前职务) continue;
      walk机构(data, (instName, inst) => {
        if (!duty.includes(instName)) return;
        if (duty.includes('主官') || duty.includes('一把手')) inst.一把手 = roleName;
        else if (duty.includes('副手') || duty.includes('二把手')) inst.二把手 = roleName;
        else if (duty.includes('副职')) inst.副职 = _.uniq([...(inst.副职 ?? []), roleName]);
        else if (duty.includes('成员')) inst.成员 = _.uniq([...(inst.成员 ?? []), roleName]);
      });
    }
  }
}

function sync机构负责人And职务(data: AnyRecord, before: AnyRecord, now: string) {
  const dutyMap = new Map<string, string[]>();

  walk机构(data, (instName, inst) => {
    addDuty(dutyMap, inst.一把手, `${instName}主官`);
    addDuty(dutyMap, inst.二把手, `${instName}副手`);
    for (const name of inst.副职 ?? []) addDuty(dutyMap, name, `${instName}副职`);
    for (const name of inst.成员 ?? []) addDuty(dutyMap, name, `${instName}成员`);
  });

  for (const [name, duties] of dutyMap.entries()) {
    const found = findRole(data, name);
    if (!found) continue;
    const newDuty = _.uniq(duties).join('；');
    const oldDuty = found.role.当前职务;
    if (oldDuty !== newDuty) {
      found.role.当前职务 = newDuty;
      appendHistory(data, name, `职务调整为${newDuty}`, '兜底脚本', now);
      console.info(`[群友群穿兜底] 同步 ${name}.当前职务 = ${newDuty}`);
    }
  }

  const beforeDuties = collectAllInstitutionMembers(before);
  for (const name of beforeDuties) {
    if (dutyMap.has(name)) continue;
    const found = findRole(data, name);
    if (found && found.role.当前职务 && found.role.当前职务 !== '无') {
      found.role.当前职务 = '无';
      appendHistory(data, name, '卸任当前机构职务', '兜底脚本', now);
    }
  }
}

function addDuty(map: Map<string, string[]>, name: string, duty: string) {
  if (!name || ['空缺', '无'].includes(name)) return;
  map.set(name, [...(map.get(name) ?? []), duty]);
}

function collectAllInstitutionMembers(data: AnyRecord): Set<string> {
  const result = new Set<string>();
  walk机构(data, (_instName, inst) => {
    for (const name of [inst.一把手, inst.二把手, ...(inst.副职 ?? []), ...(inst.成员 ?? [])]) {
      if (name && !['空缺', '无'].includes(name)) result.add(name);
    }
  });
  return result;
}

function enforceDeaths(data: AnyRecord, before: AnyRecord, now: string) {
  for (const root of ['群友角色', '非群友角色']) {
    const roles = (_.get(data, root, {}) ?? {}) as Record<string, AnyRecord>;
    const beforeRoles = (_.get(before, root, {}) ?? {}) as Record<string, AnyRecord>;
    for (const [name, role] of Object.entries(roles)) {
      const wasDead = beforeRoles[name]?.人身安全 === SAFETY_DEAD;
      if (wasDead && role.人身安全 !== SAFETY_DEAD) {
        role.人身安全 = SAFETY_DEAD;
        warn(`${name} 已死亡不可复活，已回滚人身安全`);
      }
      if (role.人身安全 === SAFETY_DEAD) handleDeath(data, name, now);
    }
  }
}

function handleDeath(data: AnyRecord, name: string, now: string) {
  walk机构(data, (_instName, inst) => {
    if (inst.一把手 === name) {
      inst.一把手 = '空缺';
      inst.运作状态 = '空缺待补';
    }
    if (inst.二把手 === name) inst.二把手 = '无';
    inst.副职 = (inst.副职 ?? []).filter((item: string) => item !== name);
    inst.成员 = (inst.成员 ?? []).filter((item: string) => item !== name);
  });
  appendHistory(data, name, '已死亡', '兜底脚本', now);
  appendEvent(data, `${name}死亡`, '角色死亡；机构职务已清空', now);
}

function sync政治阶段(data: AnyRecord) {
  const stage = String(_.get(data, '世界.政治阶段', ''));
  if (stage.includes('临时领导小组')) {
    _.set(data, '组织结构.当前体制', '临时领导小组');
    _.set(data, '组织结构.当前最高权力机构', '临时领导小组');
  } else if (stage.includes('政治局常委会')) {
    _.set(data, '组织结构.当前体制', '中央政治局常委会制');
    _.set(data, '组织结构.当前最高权力机构', '政治局常委会');
  } else if (stage.includes('军管')) {
    _.set(data, '组织结构.当前体制', '军管');
    const military = Object.entries(_.get(data, '组织结构.机构', {}) ?? {}).find(
      ([name, inst]) => name.includes('军委') || String((inst as AnyRecord).类型 ?? '').includes('军事'),
    );
    if (military) _.set(data, '组织结构.当前最高权力机构', military[0]);
  }
}

function enforce基地车AndMaterials(data: AnyRecord, before: AnyRecord) {
  const devices = (_.get(data, '基地车.核心设备状态', {}) ?? {}) as Record<string, AnyRecord>;
  const beforeDevices = (_.get(before, '基地车.核心设备状态', {}) ?? {}) as Record<string, AnyRecord>;
  for (const [name, device] of Object.entries(devices)) {
    const beforeState = beforeDevices[name]?.状态;
    if (beforeState && stateRank(CORE_DEVICE_ORDER, device.状态) < stateRank(CORE_DEVICE_ORDER, beforeState)) {
      device.状态 = beforeState;
      warn(`核心设备 ${name} 损坏不可逆，已回滚状态为 ${beforeState}`);
    }
  }

  const reactor = devices.聚变堆;
  if (['故障', '损毁'].includes(reactor?.状态)) {
    _.set(data, '基地车.反应堆状态', reactor.状态 === '损毁' ? '危急' : '故障');
    _.set(data, '基地车.反应堆功率等级', '低功率维持');
    appendCrisis(data, '聚变堆故障导致基地车能力降级', '核心设备聚变堆故障/损毁', '极高');
  }

  const materials = (_.get(data, '基地车.物资储备', {}) ?? {}) as Record<string, AnyRecord>;
  if (materials.给养?.储备水平 === '耗尽') appendCrisis(data, '给养断绝引发内乱', '给养储备耗尽', '高');
  if (['已损失', '污染风险'].includes(materials.高产作物种子?.储备水平)) {
    appendCrisis(data, '长期农业突围失败', `高产作物种子${materials.高产作物种子?.储备水平}`, '高');
  }
}

function sync外部势力升级(data: AnyRecord, before: AnyRecord) {
  const forces = (_.get(data, '外部势力', {}) ?? {}) as Record<string, AnyRecord>;
  const beforeForces = (_.get(before, '外部势力', {}) ?? {}) as Record<string, AnyRecord>;
  for (const [name, force] of Object.entries(forces)) {
    const oldLevel = beforeForces[name]?.对穿越者了解程度;
    const newLevel = force?.对穿越者了解程度;
    if (!oldLevel || stateRank(UNDERSTANDING_ORDER, newLevel) <= stateRank(UNDERSTANDING_ORDER, oldLevel)) continue;
    appendEvent(data, `${name}对穿越者了解程度升级为${newLevel}`, '外部压力上升');
    if (['掌握部分情报', '深入了解', '完全掌握'].includes(newLevel)) {
      appendCrisis(data, `${name}开始调查当涂异事`, `${name}了解程度升至${newLevel}`, '中');
    }
    if (['深入了解', '完全掌握'].includes(newLevel) && force.对穿越者态度 === '敌对') {
      appendCrisis(data, `${name}调兵围剿`, `${name}深入了解且敌对`, '极高');
    }
  }
}

function sync历史大事件(data: AnyRecord, before: AnyRecord) {
  const date = String(_.get(data, '世界.当前日期', START_DATE));
  if (date === _.get(before, '世界.当前日期')) return;
  const events: Array<[string, string]> = [
    ['1905-08-20', '同盟会成立已发生，革命党组织化程度上升'],
    ['1905-09-02', '废除科举已发生，旧士绅秩序震动'],
    ['1905-09-05', '日俄战争结束，东北与列强局势进入战后重组'],
  ];
  for (const [eventDate, text] of events) {
    if (date >= eventDate && String(_.get(before, '世界.当前日期', START_DATE)) < eventDate) {
      _.set(data, '国内情势.历史大事件进度', text);
      appendEvent(data, text, '全国态势变化');
    }
  }
}

function sync军事模块(data: AnyRecord, before: AnyRecord, now: string) {
  const institutions = (_.get(data, '组织结构.机构', {}) ?? {}) as Record<string, AnyRecord>;
  const troops = (_.get(data, '军事.部队', {}) ?? {}) as Record<string, AnyRecord>;

  for (const [instName, inst] of Object.entries(institutions)) {
    if (!String(inst.类型 ?? '').includes('军事')) continue;
    if (!troops[instName]) {
      troops[instName] = defaultTroop(inst, data);
      console.info(`[群友群穿兜底] 为军事机构 ${instName} 创建军事.部队条目`);
    }
  }
  for (const [troopName, troop] of Object.entries(troops)) {
    if (!institutions[troopName]) {
      institutions[troopName] = defaultMilitaryInstitution(troopName, troop, data);
      console.info(`[群友群穿兜底] 为部队 ${troopName} 创建军事指挥机构`);
    }
    const inst = institutions[troopName];
    if (Number(troop.兵力 ?? 0) !== Number(inst.实有人数 ?? 0)) troop.兵力 = Number(inst.实有人数 ?? troop.兵力 ?? 0);
  }
  _.set(data, '军事.部队', troops);
  _.set(data, '组织结构.机构', institutions);

  enforceAmmo(data, before);
}

function defaultTroop(inst: AnyRecord, data: AnyRecord) {
  return {
    兵力: Number(inst.实有人数 ?? 0),
    训练水平: '未训练',
    士气: '稳定',
    当前位置: '',
    当前任务: inst.当前任务 ?? '',
    备注: '由兜底脚本根据军事指挥机构自动创建',
  };
}

function defaultMilitaryInstitution(name: string, troop: AnyRecord, data: AnyRecord) {
  const hasCmc = !!_.get(data, ['组织结构', '机构', '中央军委']);
  return {
    类型: '军事指挥',
    一把手: '空缺',
    二把手: '无',
    副职: [],
    成员: [],
    权势指数: 30,
    运作状态: '组建中',
    当前任务: troop.当前任务 ?? '',
    实有人数: Number(troop.兵力 ?? 0),
    上级机构: hasCmc ? '中央军委' : '',
  };
}

function enforceAmmo(data: AnyRecord, before: AnyRecord) {
  const oldAmmo = _.get(before, '军事.现代弹药储备');
  const newAmmo = _.get(data, '军事.现代弹药储备');
  if (oldAmmo && stateRank(AMMO_ORDER, newAmmo) < stateRank(AMMO_ORDER, oldAmmo)) {
    _.set(data, '军事.现代弹药储备', oldAmmo);
    warn(`现代弹药储备不可逆，已回滚为 ${oldAmmo}`);
  }
  if (_.get(data, '军事.现代弹药储备') === '耗尽') appendCrisis(data, '现代弹药耗尽', '现代弹药储备=耗尽', '极高');
}

function sync情报模块(data: AnyRecord, before: AnyRecord) {
  const networks = (_.get(data, '情报.对外情报网络', {}) ?? {}) as Record<string, AnyRecord>;
  const forces = (_.get(data, '外部势力', {}) ?? {}) as Record<string, AnyRecord>;
  for (const forceName of Object.keys(networks)) {
    if (!forces[forceName]) forces[forceName] = defaultExternalForce();
  }
  _.set(data, '外部势力', forces);

  const antIntel = String(_.get(data, '情报.反间谍', ''));
  for (const [name, force] of Object.entries(forces)) {
    const oldLevel = _.get(before, ['外部势力', name, '对穿越者了解程度']);
    if (oldLevel && stateRank(UNDERSTANDING_ORDER, force.对穿越者了解程度) > stateRank(UNDERSTANDING_ORDER, oldLevel)) {
      if (antIntel.includes('严密') || antIntel.includes('有效'))
        warn(`反间谍严密但 ${name} 了解程度仍上升，需检查合理性`);
      if (antIntel.includes('形同虚设') || antIntel.includes('有漏洞'))
        appendEvent(data, `${name}情报渗透加剧`, '反间谍失效');
    }
  }
  if (
    (antIntel.includes('有漏洞') || antIntel.includes('形同虚设')) &&
    Object.values(forces).some(force => ['深入了解', '完全掌握'].includes(force.对穿越者了解程度))
  ) {
    appendCrisis(data, '对方已深入掌握我方情报，战略被动', '反间谍效果低且外部势力深入了解', '高');
  }

  decayIntelReliability(data, networks);
  deriveIntelAccuracy(data, networks);
}

function defaultExternalForce() {
  return {
    对穿越者态度: '未察觉',
    对穿越者了解程度: '一无所知',
    在当地影响力: 0,
    近期行动: '',
    内部矛盾: '',
    我方外交策略: '观望',
    外交关系: '无',
    内部分支: '无',
  };
}

function decayIntelReliability(data: AnyRecord, networks: Record<string, AnyRecord>) {
  for (const [name, node] of Object.entries(networks)) {
    const text = String(node.最近情报 ?? '');
    const match = text.match(/1905-\d{2}-\d{2}/);
    if (!match) continue;
    const age = daysBetween(match[0], String(_.get(data, '世界.当前日期', START_DATE)));
    if (age > 30) {
      const rank = stateRank(RELIABILITY_ORDER, node.可靠性);
      node.可靠性 = RELIABILITY_ORDER[Math.min(rank + 1, RELIABILITY_ORDER.length - 1)] ?? '不可靠';
      if (node.可靠性 === '不可靠') appendEvent(data, `${name}情报来源失联或失效`, '情报可靠性衰减');
    }
  }
}

function deriveIntelAccuracy(data: AnyRecord, networks: Record<string, AnyRecord>) {
  const reliableCount = Object.values(networks).filter(node => ['可靠', '基本可靠'].includes(node.可靠性)).length;
  const networkCount = Object.keys(networks).length;
  const value = reliableCount >= 3 ? '高' : reliableCount >= 1 ? '中' : networkCount > 0 ? '低' : '盲区';
  _.set(data, '情报.情报准确度', value);
  if (value === '盲区' && daysBetween(START_DATE, String(_.get(data, '世界.当前日期', START_DATE))) > 7)
    appendCrisis(data, '长期情报盲区', '穿越超过7天且无情报网络', '高');
}

function sync科技树(data: AnyRecord, _before: AnyRecord) {
  const date = String(_.get(data, '世界.当前日期', START_DATE));
  const major = (_.get(data, '科技树.主要研究槽', []) ?? []) as AnyRecord[];
  const minor = (_.get(data, '科技树.次要研究槽', []) ?? []) as AnyRecord[];
  const abilities = (_.get(data, '科技树.已解锁能力清单', []) ?? []) as string[];
  const completedNodes = new Set(abilitiesToNodeNames(abilities));

  // 1. 校验并补全研究槽字段；剔除未定义节点；检查前置依赖
  for (const slot of [...major, ...minor]) {
    const name = String(slot?.节点名 ?? '');
    const def = 科技树[name];
    if (!def) {
      slot.节点名 = '';
      slot.研发进度 = 0;
      slot.启动日期 = '';
      warn(`研究槽中存在未定义科技节点 ${name}，已清空`);
      continue;
    }
    slot.研发进度 = _.clamp(Number(slot?.研发进度 ?? 0), 0, 100);
    slot.启动日期 = String(slot?.启动日期 ?? '');

    // 前置依赖检查：若前置未完成，清空槽位
    if (slot.研发进度 > 0 && !isPrereqDone(completedNodes, def.前置科技)) {
      slot.节点名 = '';
      slot.研发进度 = 0;
      slot.启动日期 = '';
      warn(`节点 ${name} 前置科技尚未完成，研究槽已清空`);
      continue;
    }

    // 启动日期补全：有进度但无启动日期时，回填当前日期
    if (slot.研发进度 > 0 && !slot.启动日期) {
      slot.启动日期 = date;
    }
  }

  // 2. 检测研发进度 ≥ 100 的节点，完成之
  const newlyCompleted: Array<{ name: string; def: (typeof 科技树)[string] }> = [];
  for (const slot of [...major, ...minor]) {
    const name = String(slot?.节点名 ?? '');
    if (!name || Number(slot.研发进度 ?? 0) < 100) continue;
    const def = 科技树[name];
    if (!def) continue;
    newlyCompleted.push({ name, def });
    // 清空槽位，释放给下一个节点
    slot.节点名 = '';
    slot.研发进度 = 0;
    slot.启动日期 = '';
  }

  // 3. 处理新完成节点：insert 能力、追加事件、联动其他模块
  for (const { name, def } of newlyCompleted) {
    for (const ability of def.解锁能力) {
      const entry = `[${def.所属分支}] ${ability}（${name}，${date}完成）`;
      if (!abilities.includes(entry)) abilities.push(entry);
    }
    appendEvent(data, `科技突破：${name} 研发完成`, `解锁：${def.解锁能力.join('；')}`);
    applyTechUnlock(data, name, def.解锁能力);
    completedNodes.add(name);
  }

  // 4. 写回
  _.set(data, '科技树.主要研究槽', major);
  _.set(data, '科技树.次要研究槽', minor);
  _.set(data, '科技树.已解锁能力清单', abilities);
  _.set(data, '科技树.科技自主度', deriveAutonomy(completedNodes));
}

/** 从已解锁能力清单条目中反解出节点名。
 *  条目格式：[分支] 能力描述（节点名，YYYY-MM-DD完成） */
function abilitiesToNodeNames(abilities: string[]): string[] {
  const names: string[] = [];
  for (const entry of abilities) {
    const m = String(entry).match(/（([^，,]+)，\d{4}-\d{2}-\d{2}完成）$/);
    if (m) names.push(m[1]);
  }
  return names;
}

function isPrereqDone(completedNodes: Set<string>, prereqs: string[]): boolean {
  return prereqs.every(name => completedNodes.has(name));
}

function applyTechUnlock(data: AnyRecord, nodeName: string, abilities: string[]) {
  for (const ability of abilities) {
    if (/通信|电报/.test(ability)) appendEvent(data, `${nodeName}使通信能力提升`, ability);
    if (/电力|发电/.test(ability)) {
      const cur = String(_.get(data, '基地车.外骨骼现状', ''));
      if (!cur.includes('独立发电'))
        _.set(data, '基地车.外骨骼现状', `${cur}${cur ? '；' : ''}科技突破提示：可由独立发电分担部分负载`);
    }
    if (/可生产|可制造|步枪|火药|手榴弹/.test(ability)) appendEvent(data, `${nodeName}提示可调整武器装备清单`, ability);
    if (/医药|外科|防疫|卫生/.test(ability)) appendEvent(data, `${nodeName}提升医疗/防疫能力`, ability);
  }
}

function deriveAutonomy(completedNodes: Set<string>): string {
  if (completedNodes.size === 0) return '完全依赖';
  let independent = 0;
  for (const name of completedNodes) {
    const def = 科技树[name];
    if (def && !String(def?.备注 ?? '').includes('依赖基地车')) independent++;
  }
  const ratio = independent / completedNodes.size;
  if (ratio < 0.2) return '完全依赖';
  if (ratio < 0.4) return '重度依赖';
  if (ratio < 0.6) return '部分自主';
  if (ratio < 0.8) return '基本自主';
  return '完全自主';
}

function ensure制度详情(data: AnyRecord) {
  walk机构(data, (name, inst) => {
    if (inst.制度详情 || Number(inst.实有人数 ?? 0) <= 0) return;
    inst.制度详情 = {
      所属体系: '',
      机构性质: '常设机构',
      级别: '',
      职务体系: '',
      领导体制: '属地管理',
      上级业务主管: '无',
      决策规则: '一把手拍板；首长负责制',
      任命权限: `${_.get(data, '组织结构.当前最高权力机构', '')}任命`,
      职级: '',
      议事协调备注: '无',
      请示报告要求: '',
      保密等级: '内部',
    };
    warn(`已为机构 ${name} 自动补空制度详情`);
  });
}

function validate党政双首长(data: AnyRecord) {
  walk机构(data, (name, inst) => {
    const detail = inst.制度详情;
    if (!detail) return;
    if (detail.所属体系 === '党' && !/书记|常委/.test(detail.职务体系 + inst.当前任务))
      warn(`${name} 为党体系机构，职务体系/任务中未体现书记或常委`);
    if (detail.所属体系 === '军' && inst.一把手 && inst.一把手 === inst.二把手) warn(`${name} 军体系双首长不可兼任`);

    if (inst.一把手 === '空缺' && inst.二把手 !== '无') warn(`${name} 主官空缺，可由二把手代理`);
    if (detail.机构性质 === '议事协调机构' && detail.依托部门 === '无') warn(`${name} 为议事协调机构但依托部门为无`);
  });
}

function validate条块关系(data: AnyRecord) {
  walk机构(data, (name, inst) => {
    const detail = inst.制度详情;
    if (!detail) return;
    if (
      ['垂直管理', '双重领导', '业务指导'].includes(detail.领导体制) &&
      (!detail.上级业务主管 || detail.上级业务主管 === '无')
    ) {
      warn(`${name} 领导体制=${detail.领导体制}，但上级业务主管为空/无`);
    }
    if (detail.领导体制 === '属地管理' && detail.上级业务主管 && detail.上级业务主管 !== '无')
      warn(`${name} 属地管理机构不应设置上级业务主管`);
    if (detail.领导体制 === '双重领导' && !inst.上级机构) warn(`${name} 双重领导机构须同时存在块状上级机构`);
    if (/监察|纪委/.test(String(inst.类型 ?? name)) && inst.运作状态 === '正常' && detail.领导体制 !== '垂直管理')
      warn(`${name} 监察类机构建议采用垂直管理`);
  });
}

function sync财政联动(data: AnyRecord, before: AnyRecord) {
  const finance = _.get(data, '组织结构.财政', {}) as AnyRecord;
  const beforeFinance = _.get(before, '组织结构.财政', {}) as AnyRecord;
  if (finance.财政状况 === '赤字' && beforeFinance.财政状况 === '赤字')
    appendCrisis(data, '财政崩溃引发政权危机', '财政连续赤字', '高');
  if (finance.财政状况 === '破产') {
    appendEvent(data, '财政破产', '政权失控');
  }
  if (finance.审计机构 === '无' && daysBetween(START_DATE, String(_.get(data, '世界.当前日期', START_DATE))) > 60)
    appendCrisis(data, '长期无审计，腐败滋生', '审计机构=无且穿越天数>60', '中');
  if (finance.预算审批权 && !_.get(data, ['组织结构', '机构', finance.预算审批权]))
    warn(`财政.预算审批权 指向不存在机构：${finance.预算审批权}`);

  const expenses = finance.主要支出 ?? {};
  walk机构(data, (name, inst) => {
    if (Number(inst.权势指数 ?? 0) > 80 && !Object.keys(expenses).some(item => item.includes(name)))
      warn(`${name} 权势指数>80，但财政.主要支出中无对应经费项`);
  });
}

function sync人事任命(data: AnyRecord, before: AnyRecord) {
  const personnel = _.get(data, '组织结构.人事');
  if (!personnel) return;
  const records = (personnel.关键岗位任命记录 ?? []) as AnyRecord[];
  walk机构(data, (name, inst) => {
    const beforeInst = _.get(before, ['组织结构', '机构', name], {}) as AnyRecord;
    for (const field of ['一把手', '二把手']) {
      if (!inst[field] || inst[field] === beforeInst[field]) continue;
      records.push({
        岗位: `${name}${field}`,
        任命人: inst[field],
        任命主体: inst.制度详情?.任命权限 ?? '',
        任命时间: _.get(data, '世界.当前日期', START_DATE),
      });
      warn(`追加人事任命记录：${name}${field}=${inst[field]}`);
    }
  });
  personnel.关键岗位任命记录 = _.takeRight(records, 10);
}

function validate监督(data: AnyRecord) {
  const supervisorName = _.get(data, '组织结构.当前监督机构');
  if (!supervisorName) return;
  if (supervisorName === '无' && daysBetween(START_DATE, String(_.get(data, '世界.当前日期', START_DATE))) > 90)
    appendCrisis(data, '无独立监督，派系清洗风险', '当前监督机构=无且穿越天数>90', '高');
  const supervisor = _.get(data, ['组织结构', '机构', supervisorName]) as AnyRecord | undefined;
  if (!supervisor) return;
  if (['瘫痪', '半瘫痪'].includes(supervisor.运作状态))
    appendCrisis(data, '监督机构失效，腐败蔓延', `${supervisorName}运作状态=${supervisor.运作状态}`, '高');
  const topName = _.get(data, '组织结构.当前最高权力机构');
  const top = _.get(data, ['组织结构', '机构', topName]) as AnyRecord | undefined;
  if (top?.一把手 && supervisor.一把手 === top.一把手) warn('监督者与被监督者重合');
}

function validate领导小组(data: AnyRecord) {
  walk机构(data, (name, inst) => {
    const detail = inst.制度详情;
    if (!detail) return;
    if (detail.机构性质 === '议事协调机构') {
      if (!detail.组长级别 || detail.组长级别 === '无') warn(`${name} 议事协调机构缺少组长级别`);
      if (!detail.依托部门 || detail.依托部门 === '无') warn(`${name} 议事协调机构缺少依托部门`);
      if (inst.一把手 === '空缺') warn(`${name} 领导小组组长不可空缺`);
    }
    if (detail.机构性质 === '常设机构' && detail.组长级别 && detail.组长级别 !== '无')
      warn(`${name} 常设机构不应设置组长级别`);
  });
}

function stateRank(order: string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? 0 : index;
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.floor((end - start) / 86_400_000);
}
