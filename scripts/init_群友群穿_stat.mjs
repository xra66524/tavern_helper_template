/**
 * init_群友群穿_stat.mjs —— 阶段二：生成 initvar.yaml
 *
 * 从群友群穿/世界书/00-04 解析 94 人档案 -> 生成完整 initvar.yaml
 * 依赖：读取 tech_tree.ts 获取所有科技节点名
 * 输出：群友群穿/世界书/变量/initvar.yaml
 *
 * 用法：node scripts/init_群友群穿_stat.mjs
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- 配置开关 ---
// 核心群友模式：initvar 只保存核心群友的详细数据，其余群友数据在世界书中
// 设为 false 则生成全部 94 人（完整模式）
const CORE_ONLY = true;
const CORE_CHARACTERS = new Set(['326', 'nep', '老秦', '东风', '冰镐', '克格勃', '薪王', '长烟']);

// --- 常量路径 ---
const 世界书_DIR = resolve(ROOT, '群友群穿', '世界书');
const 组别映射 = {
  '00_老纳垢群': resolve(世界书_DIR, '00_老纳垢群'),
  '01_新冰镐群': resolve(世界书_DIR, '01_新冰镐群'),
  '02_长烟群': resolve(世界书_DIR, '02_长烟群'),
  '03_割席独立': resolve(世界书_DIR, '03_割席独立'),
  '04_私人关系': resolve(世界书_DIR, '04_私人关系'),
};
const COT_PATH = resolve(世界书_DIR, 'Cot说明.yaml');
const OUTPUT_DIR = resolve(世界书_DIR, '变量');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'initvar.yaml');
const TECH_TREE_PATH = resolve(ROOT, 'src', '群友群穿', 'tech_tree.ts');

// --- YAML 序列化工具（轻量，无外部依赖）---
function toYaml(obj, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);

  if (obj === null || obj === undefined) return '~';
  if (typeof obj === 'string') {
    if (obj === '') return "''";
    // 纯数字字符串需加引号，否则 YAML 会解析为 number（如人名 "326"）
    if (/^-?\d+$/.test(obj) || /^-?\d+\.\d+$/.test(obj)) return JSON.stringify(obj);
    if (/[:\n#{}[\]',&*?|>!%@`" ]/.test(obj)) {
      return JSON.stringify(obj);
    }
    return obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'bigint') return String(obj) + 'n';

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const ai = indent + 1; // array item indent (one more than parent)
    const aip = '  '.repeat(ai); // padding for `- item`
    const items = obj.map(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Build array-item object manually: flat format with proper nesting
        const itemKeys = Object.keys(item);
        const itemStr = itemKeys.map((k, idx) => {
          if (idx === 0) {
            // First key: `- key: value`
            const prefix = aip + '- ' + k + ': ';
            const v = item[k];
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              if (Object.keys(v).length === 0) return prefix + '{}';
              const sub = toYaml(v, ai + 1);
              return prefix + sub.trimStart();
            }
            if (Array.isArray(v)) return prefix + toYaml(v, ai + 1).trimStart();
            return prefix + toYaml(v, 0).trimStart();
          }
          // Subsequent keys: `  key: value` (indented under `-`)
          const prefix = aip + '  ' + k + ': ';
          const v = item[k];
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            if (Object.keys(v).length === 0) return prefix + '{}';
            const sub = toYaml(v, ai + 2);
            return prefix + sub.trimStart();
          }
          if (Array.isArray(v) && v.length === 0) return prefix + '[]';
          if (Array.isArray(v)) return prefix + toYaml(v, ai + 2).trimStart();
          return prefix + toYaml(v, 0).trimStart();
        });
        return itemStr.join('\n');
      }
      if (typeof item === 'string' && item === '') return aip + "- ''";
      return aip + '- ' + toYaml(item, 0).trimStart();
    });
    return '\n' + items.join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const lines = keys.map(key => {
      const val = obj[key];
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        if (Object.keys(val).length === 0) return pad + key + ': {}';
        const sub = toYaml(val, indent + 1);
        return pad + key + ':' + sub;
      }
      if (Array.isArray(val) && val.length === 0) {
        return pad + key + ': []';
      }
      if (Array.isArray(val)) {
        return pad + key + ':' + toYaml(val, indent + 1);
      }
      return pad + key + ': ' + toYaml(val, indent + 1);
    });
    return '\n' + lines.join('\n');
  }

  return String(obj);
}

// --- 从 COT 解析 94 人名单 ---
function parseCotPersonList(text) {
  const allNames = [];
  const femaleNames = new Set();
  const match = text.match(/<特别说明>([\s\S]*?)<\/特别说明>/);
  if (!match) return { allNames, femaleNames };
  const block = match[1];
  const nameLineMatch = block.match(/群友人员总名单[^：:]*[：:]([^\n]+)/);
  if (nameLineMatch) {
    const raw = nameLineMatch[1].trim();
    const tokens = raw.split(/[，,、\s]+/).filter(Boolean);
    for (const token of tokens) {
      const clean = token.trim();
      if (!clean) continue;

      // 先尝试匹配女性标记 "血包（女)" "三叶（女）" "淑仪（女)共计94人"
      // 注意：必须在 /共计/ 检查之前，因为 "淑仪（女)共计94人" 含有 "共计"
      const femaleMatch = clean.match(/^(.+?)（女[）)]/);
      if (femaleMatch) {
        allNames.push(femaleMatch[1].trim());
        femaleNames.add(femaleMatch[1].trim());
        continue;
      }

      // 处理 "淑仪（女)共计94人" 但女性标记没被捕获的 fallback
      if (/共计\d+人$/.test(clean)) {
        const baseName = clean.replace(/共计\d+人$/, '').trim();
        const nameOnly = baseName.replace(/（女[）)]$/, '');
        if (nameOnly !== baseName) {
          allNames.push(nameOnly.trim());
          femaleNames.add(nameOnly.trim());
          continue;
        }
        if (baseName) {
          allNames.push(baseName);
        }
        continue;
      }

      // 跳过纯 "共计" 标记
      if (/共计\d+人/.test(clean)) continue;

      allNames.push(clean);
    }
  }
  return { allNames, femaleNames };
}

// --- 从角色档案文件解析基本信息 ---
function parseCharFile(filePath, group) {
  const content = readFileSync(filePath, 'utf-8');
  let name = '',
    gender = '',
    age = 0;
  const nameMatch = content.match(/姓名:\s*(.+)/);
  if (nameMatch) {
    name = nameMatch[1].trim();
    // 处理 "弥雨（真实姓名徐广羽..." 这种括号注释
    const parenIdx = name.indexOf('（');
    if (parenIdx > 0) name = name.slice(0, parenIdx).trim();
  }
  const genderMatch = content.match(/性别:\s*(.+)/);
  if (genderMatch) gender = genderMatch[1].trim();
  const ageMatch = content.match(/年龄[:：]\s*(\d+)/);
  if (ageMatch) age = parseInt(ageMatch[1], 10);
  else {
    const descAge = content.match(/穿越前[:：].*?(\d+)[周岁岁]/);
    if (descAge) age = parseInt(descAge[1], 10);
  }
  return { name, gender, age, group };
}

// --- 从 tech_tree.ts 提取所有节点名 ---
function extractTechNodeNames(tsContent) {
  const names = [];
  const regex = /^\s{2}([a-zA-Z\u4e00-\u9fff0-9_/]+):\s*\{$/gm;
  let m;
  while ((m = regex.exec(tsContent)) !== null) {
    const name = m[1].trim();
    if (name !== '科技树') names.push(name);
  }
  return names;
}

// 从 tech_tree.ts 提取节点定义（所属分支 + 解锁能力），用于生成初始已解锁能力清单
function extractTechNodeDefs(tsContent) {
  const defs = {};
  // 匹配每个节点块：  节点名: { ... }
  const blockRegex = /^\s{2}([a-zA-Z\u4e00-\u9fff0-9_/]+):\s*\{([\s\S]*?)^\s{2}\},?$/gm;
  let m;
  while ((m = blockRegex.exec(tsContent)) !== null) {
    const name = m[1].trim();
    const body = m[2];
    if (name === '科技树') continue;
    const branchMatch = body.match(/所属分支:\s*'([^']+)'/);
    const abilitiesMatch = body.match(/解锁能力:\s*\[([^\]]*)\]/);
    const branch = branchMatch ? branchMatch[1] : '';
    const abilities = abilitiesMatch
      ? abilitiesMatch[1]
          .split(/',\s*'/)
          .map(s => s.replace(/^'|'$/g, '').trim())
          .filter(Boolean)
      : [];
    defs[name] = { 所属分支: branch, 解锁能力: abilities };
  }
  return defs;
}

// --- 从 COT 提取职务分配 ---
function extractPositions(cotText) {
  const positions = {};
  const match = cotText.match(/<特别说明>([\s\S]*?)<\/特别说明>/);
  if (!match) return positions;
  const block = match[1];

  const orgBlocks = {
    中央政治局常委会: block.match(/中央政治局常委会[：:]([^\n]+)/),
    中央办公室: block.match(/中央办公室[：:]([^\n]+)/),
    中央军委: block.match(/中央军委[：:]([\s\S]*?)(?=\n——|\n\n|$)/),
    边区政府: block.match(/边区政府[：:]([\s\S]*?)(?=\n——|\n\n|$)/),
  };

  for (const [orgName, m] of Object.entries(orgBlocks)) {
    if (!m) continue;
    const text = m[1];
    const re = /([^，,、\n]+?)(?:[（(]([^）)]*)[）)])?/g;
    let pm;
    while ((pm = re.exec(text)) !== null) {
      const pn = pm[1]?.trim();
      if (!pn || /共计\d+人/.test(pn) || pn.includes('共计')) continue;
      const title = pm[2]?.trim() || '成员';
      if (!positions[pn]) positions[pn] = [];
      positions[pn].push(orgName + title);
    }
  }

  const subRe =
    /(装备室|参谋室|后勤室|训练室|情报室|教导连[^\n]*|工业室|公安科|科技室|纪检委|民政室|农业室|外交室|财政室|建设室|教育室|计划经济室|最高法院|最高检察院|电气班组|厨房班组)[：:]([^\n]+)/g;
  let sm;
  while ((sm = subRe.exec(block)) !== null) {
    const subName = sm[1].trim();
    const peopleText = sm[2].trim();
    const re = /([^，,、\s]+?)(?:[（(]([^）)]*)[）)])?/g;
    let pm;
    while ((pm = re.exec(peopleText)) !== null) {
      const pn = pm[1]?.trim();
      if (!pn || /共计\d+人/.test(pn)) continue;
      const title = pm[2]?.trim() || '成员';
      if (!positions[pn]) positions[pn] = [];
      positions[pn].push(subName + title);
    }
  }

  return positions;
}

// --- 主函数 ---
function main() {
  console.log('=== 群友群穿 initvar 生成器 ===\n');

  // 0. 读取 tech_tree.ts
  let techNodeNames = [];
  let techTreeDefs = {};
  try {
    const techTreeContent = readFileSync(TECH_TREE_PATH, 'utf-8');
    techNodeNames = extractTechNodeNames(techTreeContent);
    techTreeDefs = extractTechNodeDefs(techTreeContent);
    console.log('读取到 ' + techNodeNames.length + ' 个科技节点定义\n');
  } catch (e) {
    console.warn('  警告: 无法读取 tech_tree.ts:', e.message);
    console.warn('  将使用内置节点列表\n');
    techNodeNames = [
      '土法堆肥',
      '基础农具制作',
      '种子筛选与保存',
      '简易垦荒',
      '人畜粪便利用',
      '轮作制度',
      '季节农时记录',
      '水利灌溉',
      '铁制农具改良',
      '畜力耕作',
      '梯田与等高种植',
      '绿肥种植',
      '病虫害土法防治',
      '粮食仓储与防霉',
      '高产作物试种',
      '土壤分类与改良',
      '嫁接与扦插技术',
      '农田水利系统',
      '气象观测与农事预测',
      '选种育种',
      '土法炼铁',
      '简易鼓风',
      '木炭烧制',
      '黏土坩埚改良',
      '铜矿石识别与采集',
      '简易铸型',
      '淬火与退火',
      '小高炉炼钢',
      '焦炭炼铁',
      '有色金属冶炼',
      '坩埚钢',
      '铸造工艺',
      '炉温测量与控制',
      '矿渣回收利用',
      '合金钢试制',
      '电解精炼',
      '粉末冶金',
      '金相观察',
      '轧制与锻造工艺',
      '定量成分分析',
      '基础机械加工',
      '手工测量与划线',
      '简易木工机械',
      '基础钳工',
      '基础卫生防疫',
      '基地车电力输出',
    ];
  }

  // 1. 读取 COT 说明
  const cotContent = readFileSync(COT_PATH, 'utf-8');
  const { allNames, femaleNames } = parseCotPersonList(cotContent);

  const cotMatch = cotContent.match(/<特别说明>([\s\S]*?)<\/特别说明>/);
  const cotText = cotMatch ? cotMatch[1] : '';
  const positions = extractPositions(cotText);

  console.log('COT 列表共 ' + allNames.length + ' 人');
  console.log('女性: ' + ([...femaleNames].join(', ') || '无') + '\n');

  // 2. 扫描各组目录角色档案
  const scannedChars = new Map();
  for (const [groupName, dirPath] of Object.entries(组别映射)) {
    if (!existsSync(dirPath)) {
      console.warn('  跳过不存在目录:', dirPath);
      continue;
    }
    const files = readdirSync(dirPath).filter(f => f.endsWith('.txt'));
    for (const file of files) {
      try {
        const info = parseCharFile(resolve(dirPath, file), groupName);
        if (info.name) {
          info.group = groupName;
          scannedChars.set(info.name, info);
        }
      } catch (e) {
        console.warn('  解析失败:', file);
      }
    }
  }
  console.log('已扫描 ' + scannedChars.size + ' 份角色档案');

  // 2.5 合并 COT 名单和扫描到的文件名单，取并集
  //    注意大小写：COT "nep" 对应文件 "NEP"
  //    注意同人异名：COT "第六" 对应文件 "还在第六"（全名）
  //    策略：扫描名若包含 COT 名（或反之），用扫描名替换 COT 名；否则追加
  const CotNameLower = new Set(allNames.map(n => n.toLowerCase()));
  const toAdd = []; // 真缺失，追加
  const toReplace = {}; // COT名 -> 扫描名（用更完整的名字替换）
  for (const [scannedName, _info] of scannedChars) {
    const snl = scannedName.toLowerCase();
    // 完全匹配（忽略大小写）
    if (CotNameLower.has(snl)) continue;

    // 检查是否包含关系（如 "第六" in "还在第六"）
    let foundPartial = false;
    for (const cotName of allNames) {
      const cnl = cotName.toLowerCase();
      if (snl.includes(cnl) || cnl.includes(snl)) {
        // 用更长的那个名字
        toReplace[cotName] = scannedName;
        foundPartial = true;
        break;
      }
    }
    if (!foundPartial) {
      toAdd.push(scannedName);
    }
  }
  if (Object.keys(toReplace).length > 0) {
    console.log(
      '  同人异名替换:',
      Object.entries(toReplace)
        .map(([k, v]) => k + '->' + v)
        .join(', '),
    );
    for (const [oldName, newName] of Object.entries(toReplace)) {
      const idx = allNames.indexOf(oldName);
      if (idx >= 0) allNames[idx] = newName;
    }
  }
  if (toAdd.length > 0) {
    console.log('  COT遗漏角色（追加）:', toAdd.join(', '));
    for (const n of toAdd) {
      allNames.push(n);
    }
  }
  console.log('  合并后共 ' + allNames.length + ' 人\n');

  // 建立 扫描名->COT名 的反向映射（用于职务查找）
  const scannedToCotName = {};
  for (const cotName of Object.keys(positions)) {
    for (const [scannedName, _info] of scannedChars) {
      const snl = scannedName.toLowerCase();
      const cnl = cotName.toLowerCase();
      if (snl === cnl || snl.includes(cnl) || cnl.includes(snl)) {
        scannedToCotName[scannedName] = cotName;
        break;
      }
    }
  }

  function getPos(name) {
    // 先按原名查
    let p = positions[name];
    if (p && p.length > 0) return p[0];
    // 再按反向映射查
    const cotName = scannedToCotName[name];
    if (cotName && cotName !== name) {
      p = positions[cotName];
      if (p && p.length > 0) return p[0];
    }
    return '无';
  }

  // 3. 构建群友角色
  const 群友角色 = {};
  // 核心群友模式：只输出组织架构中涉及的核心人物，其余群友数据存储在世界书中
  const activeNames = CORE_ONLY ? allNames.filter(n => CORE_CHARACTERS.has(n)) : allNames;
  if (CORE_ONLY) {
    console.log('核心群友模式: 共 ' + activeNames.length + ' 人（其余群友数据在世界书中）');
  }
  for (const name of activeNames) {
    const fi = scannedChars.get(name);
    const gender = femaleNames.has(name) ? '女' : fi && fi.gender ? fi.gender : '男';
    const age = fi && fi.age ? fi.age : 25;
    const pos = getPos(name);
    群友角色[name] = {
      性别: gender,
      年龄: age,
      当前职务: pos,
      当前位置: '安徽当涂县长江南岸基地车',
      当前活动: pos !== '无' ? '履行职务' : '等待分配任务',
      关系动态: '',
      人身安全: '安全',
      履历: [{ 时间: '1905-05-10 00:00', 事件: '随基地车群穿至1905年安徽当涂', 来源: 'GM' }],
      关键标签: [],
    };
  }

  // 4. 构建科技树（研究槽 + 已解锁能力清单）
  // 穿越自带能力：基础机械加工、基地车电力输出（已完成，直接进已解锁能力清单）
  const 已解锁能力清单 = [];
  for (const name of ['基础机械加工', '基地车电力输出']) {
    const def = techTreeDefs[name];
    if (!def) continue;
    for (const ability of def.解锁能力) {
      已解锁能力清单.push(`[${def.所属分支}] ${ability}（${name}，1905-05-10完成）`);
    }
  }
  // 初始研究槽：土法堆肥、基础卫生防疫已启动
  const 主要研究槽 = [{ 节点名: '土法堆肥', 研发进度: 3, 启动日期: '1905-05-10' }];
  const 次要研究槽 = [{ 节点名: '基础卫生防疫', 研发进度: 3, 启动日期: '1905-05-10' }];

  // 5. 构建完整数据（顶层直接是 stat_data 内容，不嵌套 stat_data: 键）
  const data = {
    世界: {
      当前日期: '1905-05-10',
      当前时间: '00:00',
      政治阶段: '穿越初混乱期',
      当前大事件: '94名现代群友携基地车穿越至1905年安徽当涂，正在确认处境',
      穿越天数: 0,
    },
    基地车: {
      当前位置: '安徽当涂县长江南岸',
      移动状态: '驻扎',
      反应堆功率等级: '满功率',
      配电系统负载: 30,
      反应堆状态: '正常',
      配电系统状态: '正常',
      物资储备: {
        给养: { 储备水平: '充足', 备注: '基地车储备，按百人规模约可维持3-6个月' },
        燃料: { 储备水平: '充足', 备注: '反应堆燃料可用数十年；车辆/机械用燃料有限' },
        医药: { 储备水平: '充足', 备注: '现代药品，不可复制' },
        金属备件: { 储备水平: '充足', 备注: '数控母机可制造新备件，但原料消耗不可逆' },
        现代枪械弹药: { 储备水平: '充足', 备注: '每打一发少一发，不可复制' },
        高产作物种子: { 储备水平: '完好', 备注: '不可恢复，一旦损失或杂交污染即永久失去' },
        电子设备: { 储备水平: '完好', 备注: '含通信/计算/存储设备，部分不可复制' },
      },
      核心设备状态: {
        聚变堆: { 状态: '正常', 备注: '基地车核心能源，理论寿命数十年' },
        服务器: { 状态: '正常', 备注: '承载信息化系统和数据存储' },
        数控母机: { 状态: '正常', 备注: '精密制造核心，精度远超1905年工业水平' },
        图形工作站: { 状态: '正常', 备注: '用于设计和仿真计算' },
      },
      外骨骼可用数量: 10,
      外骨骼备注: '磁体/电芯/芯片为不可补货瓶颈，损坏即报废',
    },
    科技树: {
      科技发展方针: '优先保障生存',
      技术保密等级: '选择性开放',
      本地技术吸收能力: '无法理解',
      科技自主度: '完全依赖',
      主要研究槽: 主要研究槽,
      次要研究槽: 次要研究槽,
      已解锁能力清单: 已解锁能力清单,
    },
    组织结构: {
      当前体制: '混乱',
      当前最高权力机构: '临时领导小组',
      机构: {
        临时领导小组: {
          类型: '决策核心',
          一把手: '空缺',
          二把手: '无',
          负责人: '空缺',
          副职: [],
          成员: ['nep', '东风', '326', '冰镐', '老秦', '苟赤色', '长烟'],
          权势指数: 95,
          运作状态: '正常',
          当前任务: '建立初步秩序、确认穿越处境',
          实有人数: 7,
          上级机构: '',
          制度备注: '',
        },
        临时领导小组顾问组: {
          类型: '顾问',
          一把手: '弥雨',
          二把手: '无',
          负责人: '弥雨',
          副职: [],
          成员: ['弥雨', '老林'],
          权势指数: 40,
          运作状态: '正常',
          当前任务: '提供决策建议',
          实有人数: 2,
          上级机构: '临时领导小组',
          制度备注: '',
        },
      },
      财政: {
        货币单位: '银元',
        金银比价: '1银元≈1.5克黄金',
        收入来源: { 基地车拨付: 10000 },
        主要支出: { 军费: 2000, 行政: 500, 生产投入: 3000, 民生: 1000 },
        财政状况: '平衡',
      },
      组织凝聚力: 50,
      组织控制力: '勉强维持',
      内部派系: {
        老纳垢群: {
          核心人物: ['nep', '老秦', '326', '东风', '冰镐'],
          政治倾向: '多元，技术官僚与权术派并存',
          实力权重: 60,
          当前策略: '主导建政',
        },
        新冰镐群: {
          核心人物: ['石头河', '长烟', '邪一铲'],
          政治倾向: '含男权思想圈',
          实力权重: 35,
          当前策略: '配合主导派',
        },
        长烟群: { 核心人物: ['长烟'], 政治倾向: '务实温和', 实力权重: 15, 当前策略: '稳健做事' },
        割席独立: {
          核心人物: ['脉冲', 'SCV', '苟赤色', '小杨生煎'],
          政治倾向: '政见独立，不属任何群',
          实力权重: 10,
          当前策略: '保持独立',
        },
      },
    },
    军事: {
      总兵力: 94,
      部队: {
        教导连: {
          兵力: 94,
          群友占比: 100,
          训练水平: '未训练',
          士气: '稳定',
          当前位置: '安徽当涂县长江南岸基地车周边',
          当前任务: '建立初步防御',
          备注: '',
        },
      },
      武器装备: {
        现代步枪: { 数量: 40, 来源: '基地车库存', 状态: '完好', 备注: '弹药不可复制' },
        现代手枪: { 数量: 20, 来源: '基地车库存', 状态: '完好', 备注: '弹药不可复制' },
      },
      现代弹药储备: '充足',
      弹药备注: '现代弹药不可复制，消耗后只能以土造/缴获补充，但土造弹药品质远逊于原装',
      作战记录: [],
    },
    情报: {
      对外情报网络: {},
      反间谍措施: '岗哨盘查',
      反间谍效果: '一般',
      情报准确度: '盲区',
      情报盲区: '对周边清廷官府/驻军/本地势力一无所知',
    },
    外部势力: {
      清廷中央: {
        对穿越者态度: '未察觉',
        对穿越者了解程度: '一无所知',
        在当地影响力: 60,
        近期行动: '忙于日俄战争善后与立宪筹备',
        内部矛盾: '满汉矛盾/立宪派与保守派之争',
        我方外交策略: '回避',
        已建立接触: '尚无接触渠道',
        已达成协议: '无',
        内部分支: '无',
      },
      两江总督: {
        对穿越者态度: '未察觉',
        对穿越者了解程度: '一无所知',
        在当地影响力: 80,
        近期行动: '主持地方政务',
        内部矛盾: '与安徽巡抚的职权冲突',
        我方外交策略: '观望',
        已建立接触: '尚无接触渠道',
        已达成协议: '无',
        内部分支: '无',
      },
      安徽巡抚: {
        对穿越者态度: '未察觉',
        对穿越者了解程度: '一无所知',
        在当地影响力: 70,
        近期行动: '管辖安徽全省政务',
        内部矛盾: '与两江总督的职权冲突/地方财政紧张',
        我方外交策略: '观望',
        已建立接触: '尚无接触渠道',
        已达成协议: '无',
        内部分支: '无',
      },
      日本: {
        对穿越者态度: '未察觉',
        对穿越者了解程度: '一无所知',
        在当地影响力: 30,
        近期行动: '日俄战争即将结束，准备获取满洲权益',
        内部矛盾: '军部与政党博弈',
        我方外交策略: '回避',
        已建立接触: '尚无接触渠道',
        已达成协议: '无',
        内部分支: '无',
      },
      同盟会: {
        对穿越者态度: '未察觉',
        对穿越者了解程度: '一无所知',
        在当地影响力: 10,
        近期行动: '筹备武装起义',
        内部矛盾: '组织松散/经费不足',
        我方外交策略: '观望',
        已建立接触: '尚无接触渠道',
        已达成协议: '无',
        内部分支: '无',
      },
    },
    国内情势: {
      控制区范围: '安徽当涂县长江南岸基地车周边据点',
      控制区人口: 94,
      控制区治安: '稳定',
      民众态度: '未知',
      民间传闻: '尚无——穿越者尚未与外界接触',
      本地采购能力: '受限',
      本地物价水平: '未知——尚未接触本地市场',
      周边军事态势: '清军绿营/巡防营驻扎周边府县，尚未察觉基地车存在',
      周边政权态度: '未察觉——当涂县衙尚未接到异常报告',
      全国态势: '清廷筹备立宪，革命党暗中串联，日俄战争即将结束',
      历史大事件进度: '日俄战争尚未正式结束（1905.9.5结束）/废除科举尚未发生（1905.9.2）/同盟会尚未成立（1905.8.20）',
    },
    群友角色: 群友角色,
    非群友角色: {},
    事件队列: {
      近期已发生事件: [
        {
          事件: '94名现代群友随基地车穿越至1905年安徽当涂县长江南岸',
          时间: '1905-05-10 00:00',
          影响: '全体成员/基地车',
        },
      ],
      潜在危机: [
        {
          危机: '清廷接到地方报告后可能调兵围剿',
          触发条件: '穿越者活动范围扩大至本地村庄/清廷获悉异事',
          严重程度: '高',
        },
        { 危机: '给养消耗完毕后本地采购受阻', 触发条件: '穿越天数 > 90 且本地采购渠道尚未建立', 严重程度: '高' },
      ],
    },
  };

  // 6. 输出
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const yamlContent = toYaml(data);
  writeFileSync(OUTPUT_PATH, yamlContent, 'utf-8');

  console.log('=== 生成完成 ===');
  console.log('  输出: ' + OUTPUT_PATH);
  console.log(
    '  模式: ' +
      (CORE_ONLY
        ? '核心群友模式（' + activeNames.length + '人，完整共' + allNames.length + '人）'
        : '完整模式（' + allNames.length + '人）'),
  );
  console.log('  外部势力: 5 个');
  console.log('  科技节点定义: ' + techNodeNames.length + ' 个');
  console.log('  已解锁能力: ' + 已解锁能力清单.length + ' 项');
  console.log('  初始研究槽: 主要 ' + 主要研究槽.length + ' + 次要 ' + 次要研究槽.length);
  console.log('  机构: 2 个');
  const fc = allNames.filter(n => femaleNames.has(n)).length;
  console.log('  女性: ' + fc + ' / 男性: ' + (allNames.length - fc));
}

main();
