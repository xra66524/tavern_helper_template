// ============================================================
// src/2039_mvu/constants.ts
// 所有枚举值、常量列表，供 mvu_schema.ts 引用
// ============================================================

// ─── 世界模块 ───────────────────────────────────────────────

/** 政治阶段（7种） */
export const 政治阶段列表 = [
  '遇刺潮末期',
  '看守停摆期',
  '正常选举期',
  '特别大选报名期',
  '特别大选初选期',
  '特别大选指名期',
  '新内阁执政期',
] as const;
export type 政治阶段 = (typeof 政治阶段列表)[number];

/** 选举模式（3种） */
export const 选举模式列表 = ['正常首相指名', '2039特别大选', '无'] as const;
export type 选举模式 = (typeof 选举模式列表)[number];

// ─── 日本执政模块 ───────────────────────────────────────────

/** 首相状态 */
export const 首相状态列表 = ['空位', '看守', '新任', '在任'] as const;
export type 首相状态 = (typeof 首相状态列表)[number];

/** 政治立场（光谱） */
export const 政治立场列表 = ['极右翼', '右翼', '中间偏右', '中间', '中间偏左', '左翼', '不确定'] as const;
export type 政治立场 = (typeof 政治立场列表)[number];

// ─── 阁僚子Schema ───────────────────────────────────────────

export const 对职务理解度列表 = ['完全不懂', '一知半解', '勉强理解', '熟练', '专家'] as const;
export type 对职务理解度 = (typeof 对职务理解度列表)[number];

export const 实际履职状态列表 = ['正常履职', '敷衍了事', '被架空', '完全摆烂', '恐慌中', '逃避职责'] as const;
export type 实际履职状态 = (typeof 实际履职状态列表)[number];

export const 与官僚体系的争斗状态列表 = [
  '无争斗（完全服从）',
  '暗中摩擦',
  '公开对抗',
  '拉拢分化',
  '逐步夺权',
  '已掌控局面',
] as const;
export type 与官僚体系的争斗状态 = (typeof 与官僚体系的争斗状态列表)[number];

export const 对当前职位的态度列表 = ['恐惧', '抗拒', '无奈接受', '无所谓', '认真对待', '兴奋', '麻木'] as const;
export type 对当前职位的态度 = (typeof 对当前职位的态度列表)[number];

export const 暗杀威胁等级列表 = ['无', '低', '中', '高', '极高'] as const;
export type 暗杀威胁等级 = (typeof 暗杀威胁等级列表)[number];

export const 人身安全状况列表 = ['安全', '有安保', '受到威胁', '已遇袭', '已死亡', '已流亡'] as const;
export type 人身安全状况 = (typeof 人身安全状况列表)[number];

// ─── 政策子Schema ───────────────────────────────────────────

export const 政策类型列表 = [
  '内阁提案',
  '官僚推动',
  '紧急应对',
  '外部势力施压',
  '议会立法',
  '民间/舆论推动',
  '象征性政策',
] as const;
export type 政策类型 = (typeof 政策类型列表)[number];

export const 政策推行状态列表 = [
  '提案中',
  '审议中',
  '已通过待执行',
  '执行中',
  '受阻',
  '搁置',
  '废除',
  '已完成',
] as const;
export type 政策推行状态 = (typeof 政策推行状态列表)[number];

export const 提出者理解度列表 = [
  '完全理解政策内容',
  '一知半解',
  '被诱导签字',
  '完全不知情（被冒名）',
  '不适用（非个人提出）',
] as const;
export type 提出者理解度 = (typeof 提出者理解度列表)[number];

export const 预算影响列表 = ['大幅增收', '小幅增收', '中性', '小幅支出', '大幅支出', '未评估'] as const;
export type 预算影响 = (typeof 预算影响列表)[number];

export const 执行难度列表 = ['极易', '可行', '困难', '几乎不可行'] as const;
export type 执行难度 = (typeof 执行难度列表)[number];

export const 政策效果评估列表 = ['效果显著', '略有成效', '无效果', '适得其反', '引发危机', '尚待观察'] as const;
export type 政策效果评估 = (typeof 政策效果评估列表)[number];

export const 政策影响领域列表 = [
  '经济',
  '外交',
  '军事',
  '民生',
  '政治',
  '社会',
  '能源',
  '粮食',
  '治安',
  '舆论',
] as const;
export type 政策影响领域 = (typeof 政策影响领域列表)[number];

// ─── 选举进程子Schema ───────────────────────────────────────

export const 候选人背景列表 = [
  '传统政客',
  '右翼激进',
  '左翼',
  '搞笑/恶搞',
  '外部势力代理人',
  '民间人士',
  '青少年',
  '现职官僚',
  '军警背景',
] as const;
export type 候选人背景 = (typeof 候选人背景列表)[number];

export const 候选人威胁等级列表 = ['无', '低', '中', '高'] as const;
export type 候选人威胁等级 = (typeof 候选人威胁等级列表)[number];

// ─── 各省厅子Schema ─────────────────────────────────────────

export const 省厅运作状态列表 = ['正常', '半瘫痪', '停摆'] as const;
export type 省厅运作状态 = (typeof 省厅运作状态列表)[number];

// ─── 事务次官会议子Schema ──────────────────────────────────

export const 事务次官会议状态列表 = ['运作正常', '内部严重分歧', '决策瘫痪', '被架空'] as const;
export type 事务次官会议状态 = (typeof 事务次官会议状态列表)[number];

export const 事务次官会议权力等级列表 = ['名义顾问', '与内阁分权', '主导政府运作', '完全替代内阁'] as const;
export type 事务次官会议权力等级 = (typeof 事务次官会议权力等级列表)[number];

export const 派系政治倾向列表 = ['亲CSAT', '亲美', '中立务实', '日本自主', '极右'] as const;
export type 派系政治倾向 = (typeof 派系政治倾向列表)[number];

export const 对内阁态度列表 = ['支持合作', '利用操控', '架空排斥', '敌对'] as const;
export type 对内阁态度 = (typeof 对内阁态度列表)[number];

export const 事务次官会议决策方式列表 = ['全体一致', '多数决', '强权主导', '议而不决', '秘密小圈子决策'] as const;
export type 事务次官会议决策方式 = (typeof 事务次官会议决策方式列表)[number];

export const 已决议事项执行状态列表 = ['执行中', '已执行', '搁置', '被内阁推翻', '受阻'] as const;
export type 已决议事项执行状态 = (typeof 已决议事项执行状态列表)[number];

export const 与内阁的关系列表 = ['合作', '表面合作暗中架空', '公开对立', '无视内阁自行其是', '操控内阁'] as const;
export type 与内阁的关系 = (typeof 与内阁的关系列表)[number];

export const 内阁对事务次官会议的态度列表 = ['依赖', '警惕', '反抗', '无力反抗', '默认'] as const;
export type 内阁对事务次官会议的态度 = (typeof 内阁对事务次官会议的态度列表)[number];

export const 与议会的关系列表 = ['合作良好', '互相利用', '关系紧张', '议会已被架空', '议会对抗中'] as const;
export type 与议会的关系 = (typeof 与议会的关系列表)[number];

export const 与司法的关系列表 = ['正常', '暗中施压', '司法独立受威胁', '已渗透司法'] as const;
export type 与司法的关系 = (typeof 与司法的关系列表)[number];

export const 地检署态度列表 = ['中立履职', '被政治施压', '主动配合事务次官会议', '调查事务次官会议中'] as const;
export type 地检署态度 = (typeof 地检署态度列表)[number];

export const 与CSAT的关系列表 = ['对抗', '表面强硬暗中接触', '有限合作', '深度合作', '被渗透'] as const;
export type 与CSAT的关系 = (typeof 与CSAT的关系列表)[number];

export const 与美国CIA的关系列表 = ['合作', '互相提防', '对抗', 'CIA已被驱逐', '暗中维持联系'] as const;
export type 与美国CIA的关系 = (typeof 与美国CIA的关系列表)[number];

export const 与农协的关系列表 = ['合作', '紧张', '对抗', '无视'] as const;
export type 与农协的关系 = (typeof 与农协的关系列表)[number];

export const 与极道的关系列表 = ['打击', '默许', '有限合作', '深度合作'] as const;
export type 与极道的关系 = (typeof 与极道的关系列表)[number];

export const 与大企业的关系列表 = ['合作', '有限', '紧张', '大企业外逃中'] as const;
export type 与大企业的关系 = (typeof 与大企业的关系列表)[number];

export const 事务次官会议合法性列表 = ['公认', '争议', '非法', '民众不信任'] as const;
export type 事务次官会议合法性 = (typeof 事务次官会议合法性列表)[number];

// ─── 日本国内情势模块 ───────────────────────────────────────

export const 日元贬值趋势列表 = ['稳定', '缓慢贬值', '快速贬值', '自由落体'] as const;
export type 日元贬值趋势 = (typeof 日元贬值趋势列表)[number];

export const 货币信任度列表 = ['正常流通', '大额纸币受拒', '民间转向外币', '以物易物为主', '纸币已成废纸'] as const;
export type 货币信任度 = (typeof 货币信任度列表)[number];

export const CSDC接受度列表 = ['仅官方使用', '民间开始接受', '广泛流通', '事实硬通货', '已取代日元'] as const;
export type CSDC接受度 = (typeof CSDC接受度列表)[number];

export const 通胀等级列表 = ['稳定', '温和通胀', '严重通胀', '恶性通胀', '货币崩溃'] as const;
export type 通胀等级 = (typeof 通胀等级列表)[number];

export const 粮食供应等级列表 = ['充足', '紧缺', '危机', '黑市依赖', '饥荒边缘'] as const;
export type 粮食供应等级 = (typeof 粮食供应等级列表)[number];

export const 能源供应等级列表 = ['正常', '计划停电', '严重短缺', '崩溃'] as const;
export type 能源供应等级 = (typeof 能源供应等级列表)[number];

export const 停电状况列表 = ['无', '偶发', '每日1-2小时', '每日3小时以上', '全天轮流停电'] as const;
export type 停电状况 = (typeof 停电状况列表)[number];

export const 农协状态列表 = ['稳固', '动摇', '衰退中', '濒临解体', '已解体'] as const;
export type 农协状态 = (typeof 农协状态列表)[number];

export const 农协与走私粮对抗列表 = [
  '无',
  '游说政府打击',
  '组织农民抗议',
  '武装对抗走私',
  '溃败中',
  '已放弃抵抗',
] as const;
export type 农协与走私粮对抗 = (typeof 农协与走私粮对抗列表)[number];

export const 自警团武装化程度列表 = ['未武装', '简易武器', '部分武装', '准军事化'] as const;
export type 自警团武装化程度 = (typeof 自警团武装化程度列表)[number];

export const 生命维持餐运作状态列表 = ['正常运作', '物资紧缺', '部分停供', '全面停供', '已崩溃'] as const;
export type 生命维持餐运作状态 = (typeof 生命维持餐运作状态列表)[number];

export const 生命维持餐依赖趋势列表 = ['扩大中', '稳定', '缩减中', '濒临崩溃'] as const;
export type 生命维持餐依赖趋势 = (typeof 生命维持餐依赖趋势列表)[number];

export const 教育状况列表 = ['正常', '部分停课', '大量停课', '仅维持毕业班', '全面停课'] as const;
export type 教育状况 = (typeof 教育状况列表)[number];

export const 娱乐产业景气度列表 = ['正常', '逆势增长', '爆发式增长', '泡沫化', '泡沫破裂', '全面衰退'] as const;
export type 娱乐产业景气度 = (typeof 娱乐产业景气度列表)[number];

export const LiveHouse运营状态列表 = ['正常', '人气爆棚', '过度拥挤', '部分关闭', '仅剩Galaxy', '全部停业'] as const;
export type LiveHouse运营状态 = (typeof LiveHouse运营状态列表)[number];

export const 娱乐产业外部渗透列表 = ['无', '轻微', '显著', '严重', '已深度控制'] as const;
export type 娱乐产业外部渗透 = (typeof 娱乐产业外部渗透列表)[number];

export const 治安等级列表 = ['正常', '恶化', '严峻', '失控', '无政府状态'] as const;
export type 治安等级 = (typeof 治安等级列表)[number];

export const 夜间治安列表 = ['正常', '建议不出门', '高危', '宵禁状态', '完全无夜间秩序'] as const;
export type 夜间治安 = (typeof 夜间治安列表)[number];

export const 富裕阶层外流列表 = ['正常', '增加中', '大规模外逃', '已基本出逃'] as const;
export type 富裕阶层外流 = (typeof 富裕阶层外流列表)[number];

export const 无家可归者列表 = ['极少', '增加中', '显著增加', '随处可见', '已成社会常态'] as const;
export type 无家可归者 = (typeof 无家可归者列表)[number];

export const 基础设施维护列表 = ['正常', '滞后', '严重老化', '事故频发', '多系统崩溃'] as const;
export type 基础设施维护 = (typeof 基础设施维护列表)[number];

export const 互联网状况列表 = ['正常', '偶发故障', '部分区域断网', '严重不稳定', '大面积瘫痪'] as const;
export type 互联网状况 = (typeof 互联网状况列表)[number];

export const 医疗供应等级列表 = ['正常', '部分药品短缺', '严重短缺', '仅维持急诊', '医疗系统崩溃'] as const;
export type 医疗供应等级 = (typeof 医疗供应等级列表)[number];

export const 年轻人出路分化列表 = [
  '乐队/音乐活动',
  'VTuber/地下偶像',
  '打工维生',
  '被卷入政治',
  '加入自警团',
  '加入极道/灰色经济',
  '出国/移民',
  '躺平/依赖生命维持餐',
  '上学（尚能维持）',
  '辍学',
] as const;
export type 年轻人出路分化 = (typeof 年轻人出路分化列表)[number];

// ─── 国际势力动态模块 ───────────────────────────────────────

export const 对日策略倾向列表 = ['积极扩张', '维持现状', '收缩撤出', '观望待机', '暗中渗透', '对抗遏制'] as const;
export type 对日策略倾向 = (typeof 对日策略倾向列表)[number];

export const 对日本政府态度列表 = ['承认并合作', '观望', '暗中操控', '敌对', '无视'] as const;
export type 对日本政府态度 = (typeof 对日本政府态度列表)[number];

export const 对特别大选态度列表 = ['积极干预', '暗中扶持', '观望', '试图破坏', '不关心'] as const;
export type 对特别大选态度 = (typeof 对特别大选态度列表)[number];

export const 在日行动能力列表 = ['无', '极低', '低', '中等', '高', '极高'] as const;
export type 在日行动能力 = (typeof 在日行动能力列表)[number];

export const 在日情报网络列表 = ['无', '严重受损', '受损但运作', '正常运作', '扩张中'] as const;
export type 在日情报网络 = (typeof 在日情报网络列表)[number];

// ─── 舆论场模块 ─────────────────────────────────────────────

export const 主流媒体立场列表 = ['亲政府', '中立', '批判', '分裂', '噤声'] as const;
export type 主流媒体立场 = (typeof 主流媒体立场列表)[number];

export const 社会群体对政府态度列表 = ['支持', '容忍', '不满', '敌视', '无视'] as const;
export type 社会群体对政府态度 = (typeof 社会群体对政府态度列表)[number];

// ─── 各角色情况模块 ─────────────────────────────────────────

export const 政治卷入度列表 = ['未卷入', '间接影响', '被动卷入', '主动参与', '深度卷入'] as const;
export type 政治卷入度 = (typeof 政治卷入度列表)[number];

export const 经济状况列表 = ['富裕', '中产', '困难', '贫困', '依赖生命维持餐'] as const;
export type 经济状况 = (typeof 经济状况列表)[number];

export const 人身安全列表 = ['安全', '有威胁', '需要安保', '已遇袭', '失踪', '已死亡'] as const;
export type 人身安全 = (typeof 人身安全列表)[number];

// ─── 事件队列模块 ───────────────────────────────────────────

export const 危机严重程度列表 = ['低', '中', '高', '极高'] as const;
export type 危机严重程度 = (typeof 危机严重程度列表)[number];

// ============================================================
// 常量列表（非枚举，数据映射）
// ============================================================

/** 省厅列表及其关键下属机构 */
export const 省厅与下属机构: Record<string, string[]> = {
  外务省: ['大臣官房', '综合外交政策局', '亚洲大洋洲局', '北美局', '经济局', '国际协力局', '领事局', '情报调查局'],
  防卫省: ['大臣官房', '防卫政策局', '统合幕僚监部', '陆上幕僚监部', '海上幕僚监部', '航空幕僚监部', '防卫装备厅'],
  经济产业省: [
    '大臣官房',
    '经济产业政策局',
    '通商政策局',
    '贸易经济协力局',
    '产业技术环境局',
    '制造产业局',
    '资源能源厅',
    '中小企业厅',
  ],
  农林水产省: ['大臣官房', '食料产业局', '生产局', '经营局', '农村振兴局', '水产厅'],
  财务省: ['大臣官房', '主计局', '主税局', '关税局', '理财局', '国税厅'],
  内阁官房: ['内阁总务官室', '内阁安全保障室', '内阁情报调查室', '内阁广报室', '内阁人事局'],
  警察厅: ['长官官房', '生活安全局', '刑事局', '交通局', '警备局', '组织犯罪对策部'],
  国土交通省: ['大臣官房', '综合政策局', '铁道局', '道路局', '港湾局', '航空局', '海上保安厅', '气象厅'],
  法务省: ['大臣官房', '民事局', '刑事局', '矫正局', '保护局', '人权拥护局', '入国管理局', '检察厅'],
  文部科学省: ['大臣官房', '初等中等教育局', '高等教育局', '科学技术·学术政策局', '研究振兴局', '文化厅', '体育厅'],
  厚生劳动省: [
    '大臣官房',
    '医政局',
    '健康局',
    '医药生活卫生局',
    '劳动基准局',
    '职业安定局',
    '社会·援护局',
    '老健局',
    '保险局',
    '年金局',
  ],
  总务省: ['大臣官房', '行政管理局', '自治行政局', '自治财政局', '情报流通行政局', '消防厅'],
  环境省: ['大臣官房', '综合环境政策局', '地球环境局', '自然环境局', '环境再生·资源循环局'],
  国家公安委员会: ['（警察厅为其执行机构）'],
  内阁府: ['大臣官房', '政策统括官', '宫内厅', '公正取引委员会', '消费者厅'],
} as const;

/** 省厅名称列表 */
export const 省厅列表 = Object.keys(省厅与下属机构) as (keyof typeof 省厅与下属机构)[];

/** 省厅关键性分级（供 UI 或优先级排序使用） */
export const 省厅关键性: Record<string, '极高' | '高' | '中' | '低频' | '极低'> = {
  外务省: '极高',
  防卫省: '极高',
  经济产业省: '极高',
  农林水产省: '高',
  财务省: '高',
  内阁官房: '高',
  警察厅: '高',
  国土交通省: '中',
  法务省: '中',
  文部科学省: '中',
  厚生劳动省: '中',
  总务省: '低频',
  环境省: '极低',
  国家公安委员会: '极低',
  内阁府: '高',
};

/** 外部势力列表 */
export const 外部势力列表 = ['CSAT', '美国/CIA', '朝总联', 'NATO', '俄罗斯/GRU', '西方情报联盟'] as const;
export type 外部势力 = (typeof 外部势力列表)[number];

/** 内阁职位列表（典型职位，实际可动态扩展） */
export const 内阁职位列表 = [
  '内阁总理大臣',
  '外务大臣',
  '防卫大臣',
  '经济产业大臣',
  '农林水产大臣',
  '财务大臣',
  '内阁官房长官',
  '国家公安委员会委员长',
  '国土交通大臣',
  '法务大臣',
  '文部科学大臣',
  '厚生劳动大臣',
  '总务大臣',
  '环境大臣',
  '内阁府特命担当大臣',
] as const;
export type 内阁职位 = (typeof 内阁职位列表)[number];
