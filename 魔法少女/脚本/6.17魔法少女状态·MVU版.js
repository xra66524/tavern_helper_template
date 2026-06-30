(function () {
  'use strict';
  // ════════════════════════════════════════════════════════════
  //  魔法少女状态栏 · 星河版  (魔法少女状态面板 + GM控制台)
  //  数据源：星河璀璨数据库 (window.AutoCardUpdaterAPI)
  //  主题：浅紫蓝 · 雅致魔幻（参照用户提供的状态栏配色）
  // ════════════════════════════════════════════════════════════

  let W;
  try {
    W = window.parent && window.parent.document ? window.parent : window;
  } catch (e) {
    W = window;
  }
  const D = W.document;
  const MO = W.MutationObserver || MutationObserver;
  const EV = W.Event || Event;

  try {
    if (W.__XYSB_CLEANUP__) W.__XYSB_CLEANUP__();
  } catch (e) {}

  // ──────────────────────────── 工具函数 ────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v, d) {
    const m = String(v == null ? '' : v).match(/-?\d+(\.\d+)?/);
    if (!m) return d === undefined ? 0 : d;
    return Math.round(parseFloat(m[0]));
  }
  function pair(v, defMax) {
    const s = String(v == null ? '' : v);
    const m = s.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (m) return [Math.round(parseFloat(m[1])), Math.round(parseFloat(m[2]))];
    const n = num(s, null);
    return [n == null ? 0 : n, defMax || 100];
  }
  function pct(cur, max) {
    if (!max || max <= 0) max = 100;
    const p = Math.round((cur / max) * 100);
    return Math.max(0, Math.min(100, p));
  }
  function getDB() {
    try {
      return W.AutoCardUpdaterAPI || window.AutoCardUpdaterAPI || null;
    } catch (e) {
      return null;
    }
  }
  function lsGet(k, d) {
    try {
      const v = W.localStorage.getItem(k);
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  }
  function lsSet(k, v) {
    try {
      W.localStorage.setItem(k, v);
    } catch (e) {}
  }

  // ──────────────────────────── 数据层（MVU 版）────────────────────────────
  //  读取 MVU 的 stat_data，再「翻译」回旧数据库的表格结构(headers/rows)，
  //  这样下方所有渲染代码（render / findTable / cellOf …）一行都不用改即可工作。
  function resolveFn(name) {
    try {
      if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
    } catch (e) {}
    try {
      if (W && typeof W[name] === 'function') return W[name];
    } catch (e) {}
    try {
      if (W && W.TavernHelper && typeof W.TavernHelper[name] === 'function')
        return W.TavernHelper[name].bind(W.TavernHelper);
    } catch (e) {}
    return null;
  }
  function getMvu() {
    try {
      if (typeof Mvu !== 'undefined' && Mvu) return Mvu;
    } catch (e) {}
    try {
      if (W && W.Mvu) return W.Mvu;
    } catch (e) {}
    try {
      if (window.Mvu) return window.Mvu;
    } catch (e) {}
    return null;
  }
  function latestId() {
    const f = resolveFn('getLastMessageId');
    if (f) {
      try {
        const v = f();
        if (typeof v === 'number') return v;
      } catch (e) {}
    }
    return -1;
  }
  function readStat() {
    const id = latestId();
    // 1) MVU 自带 API（最权威，反映已应用的更新）
    const M = getMvu();
    if (M && typeof M.getMvuData === 'function') {
      try {
        const d = M.getMvuData({ type: 'message', message_id: 'latest' });
        if (d && d.stat_data) return d.stat_data;
      } catch (e) {}
      try {
        const dc = M.getMvuData({ type: 'chat' });
        if (dc && dc.stat_data) return dc.stat_data;
      } catch (e) {}
    }
    // 2) 直接读消息 data（MVU 教程读法）
    const gcm = resolveFn('getChatMessages');
    if (gcm) {
      try {
        const arr = gcm(id);
        if (arr && arr[0] && arr[0].data && arr[0].data.stat_data) return arr[0].data.stat_data;
      } catch (e) {}
    }
    // 3) getVariables 兜底
    const gv = resolveFn('getVariables');
    if (gv) {
      try {
        const v = gv({ type: 'message', message_id: id });
        if (v && v.stat_data) return v.stat_data;
      } catch (e) {}
      try {
        const v2 = gv({ type: 'chat' });
        if (v2 && v2.stat_data) return v2.stat_data;
      } catch (e) {}
    }
    return null;
  }
  // 取 MVU 叶子值：[值,"说明"] → 值；纯值 → 原样
  function SG(v, d) {
    if (v === undefined || v === null) return d === undefined ? '' : d;
    if (Array.isArray(v)) {
      if (v.length === 2 && typeof v[1] === 'string' && (typeof v[0] !== 'object' || v[0] === null)) return v[0];
      return v.length ? v[0] : d === undefined ? '' : d;
    }
    return v;
  }
  // {当前:[v],上限:[v]} → "当前/上限"（供面板 pair() 再拆分）
  function hpStr(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return SG(o, '');
    const cur = SG(o.当前, ''),
      max = SG(o.上限, '');
    if (cur === '' && max === '') return '';
    return cur + '/' + max;
  }
  function tbl(headers, rows) {
    return { headers: headers, rows: rows };
  }
  // 名字键集合 {名字:{字段:[v,desc]}} → {headers:[keyHeader,...], rows:[[名字,...值]]}
  function mapColl(coll, keyHeader, fields) {
    const headers = [keyHeader];
    for (let i = 0; i < fields.length; i++) headers.push(fields[i].h);
    const rows = [];
    if (coll && typeof coll === 'object') {
      Object.keys(coll).forEach(function (name) {
        const o = coll[name] || {};
        const row = [name];
        for (let j = 0; j < fields.length; j++) {
          const f = fields[j];
          row.push(f.fn ? f.fn(o) : SG(o[f.k], ''));
        }
        rows.push(row);
      });
    }
    return tbl(headers, rows);
  }

  function readTables() {
    const S = readStat();
    if (!S) return null; // 无 MVU 数据 → 与原逻辑一致返回 null（面板显示占位提示）
    const t = {};
    const zhu = S.主角 || {},
      lv = zhu.等级 || {},
      st = zhu.状态 || {},
      g = S.全局 || {};

    // —— 主角档案（单行）——
    t['主角档案'] = tbl(
      ['姓名', '代号', '性别', '年龄', '身份阵营', '系别', '亲和', '外貌', '当前形态'],
      [
        [
          SG(zhu.姓名),
          SG(zhu.代号),
          SG(zhu.性别),
          SG(zhu.年龄),
          SG(zhu.身份阵营),
          SG(zhu.系别),
          SG(zhu.亲和),
          SG(zhu.外貌),
          SG(zhu.形态),
        ],
      ],
    );
    // —— 主角状态（单行）——
    t['主角状态'] = tbl(
      ['生命', '魔力', '侵蚀值', '恶堕阶段', '解放度', '解放阶段', '处境', '战况', '战服', '当前形态'],
      [
        [
          hpStr(st.生命),
          hpStr(st.魔力),
          SG(st.侵蚀值, '0'),
          SG(st.侵蚀阶段, '未染'),
          SG(st.解放度, '0'),
          SG(st.解放阶段, '未启'),
          SG(st.处境),
          SG(st.战况),
          SG(st.战服),
          SG(zhu.形态),
        ],
      ],
    );
    // —— 等级（单行）——
    t['等级'] = tbl(
      ['阶级', '等级', '当前经验', '升级所需', '瓶颈', '越阶'],
      [[SG(lv.阶级), SG(lv.等级), SG(lv.当前经验, '0'), SG(lv.升级所需, '0'), SG(lv.瓶颈), SG(lv.越阶)]],
    );
    // —— 全局（单行）——
    t['全局'] = tbl(['当前时间', '地点', '去向'], [[SG(g.当前时间), SG(g.地点), SG(g.去向)]]);
    // —— 躯体（多行：部位→白描）——
    const bodyRows = [];
    if (zhu.躯体 && typeof zhu.躯体 === 'object') {
      Object.keys(zhu.躯体).forEach(function (part) {
        bodyRows.push([part, SG(zhu.躯体[part], '')]);
      });
    }
    t['躯体'] = tbl(['部位', '白描'], bodyRows);

    // —— 招式 / 星器 / 行囊 / 委托 / 地点（多行）——
    t['招式'] = mapColl(S.招式, '招式名称', [
      { h: '类型', k: '类型' },
      { h: '品阶', k: '品阶' },
      { h: '熟练度', k: '熟练度' },
      { h: '效果', k: '效果' },
    ]);
    t['星器'] = mapColl(S.星器, '名称', [
      { h: '类型', k: '类型' },
      { h: '品阶', k: '品阶' },
      { h: '契合', k: '契合' },
      { h: '效果', k: '效果' },
    ]);
    t['行囊'] = mapColl(S.行囊, '物品名', [
      { h: '类别', k: '类别' },
      { h: '数量', k: '数量' },
      { h: '备注', k: '备注' },
    ]);
    t['委托'] = mapColl(S.委托, '委托名称', [
      { h: '类型', k: '类型' },
      { h: '状态', k: '状态' },
      { h: '进展', k: '进展' },
    ]);
    t['地点'] = mapColl(S.地点, '地点名', [
      { h: '所在区域', k: '所在区域' },
      { h: '类型', k: '类型' },
    ]);

    // —— 重要人物（多行；生命/魔力拆成 当前 + 上限 两列）——
    t['重要人物'] = mapColl(S.重要人物, '姓名', [
      { h: '性别', k: '性别' },
      { h: '身份', k: '身份' },
      { h: '关系', k: '关系' },
      { h: '好感', k: '好感' },
      { h: '等级', k: '等级' },
      {
        h: '生命',
        fn: function (o) {
          return SG((o.生命 || {}).当前, '');
        },
      },
      {
        h: '生命上限',
        fn: function (o) {
          return SG((o.生命 || {}).上限, '');
        },
      },
      {
        h: '魔力',
        fn: function (o) {
          return SG((o.魔力 || {}).当前, '');
        },
      },
      {
        h: '魔力上限',
        fn: function (o) {
          return SG((o.魔力 || {}).上限, '');
        },
      },
      { h: '当前状态', k: '当前状态' },
      { h: '恶堕', k: '恶堕' },
      { h: '解放', k: '解放' },
      { h: '躯体', k: '躯体' },
      { h: '招式技能', k: '招式' },
      { h: '手段', k: '手段' },
      { h: '钩子', k: '钩子' },
      { h: '最后出场', k: '最后出场' },
    ]);
    // —— 在场敌人（多行）——
    t['在场敌人'] = mapColl(S.在场敌人, '名称', [
      { h: '威胁', k: '威胁' },
      {
        h: '生命',
        fn: function (o) {
          return SG((o.生命 || {}).当前, '');
        },
      },
      {
        h: '生命上限',
        fn: function (o) {
          return SG((o.生命 || {}).上限, '');
        },
      },
      { h: '手段', k: '手段' },
      { h: '状态', k: '状态' },
    ]);

    return t;
  }
  function findTable(tables, kw) {
    if (!tables) return null;
    if (tables[kw]) return tables[kw];
    for (const n in tables) {
      if (n.indexOf(kw) !== -1) return tables[n];
    }
    return null;
  }
  function colOf(tb, kw) {
    if (!tb) return -1;
    for (let i = 0; i < tb.headers.length; i++) {
      if (String(tb.headers[i]).indexOf(kw) !== -1) return i;
    }
    return -1;
  }
  function cellOf(tb, row, kw, dflt) {
    const i = colOf(tb, kw);
    if (i < 0 || !row || row[i] == null) return dflt;
    const v = String(row[i]).trim();
    if (v === '' || v === 'null' || v === 'undefined') return dflt;
    return v;
  }
  function firstRow(tb) {
    return tb && tb.rows && tb.rows.length ? tb.rows[0] : null;
  }

  const RANKS = [
    { name: '见习', lo: 1, hi: 10 },
    { name: '正式', lo: 11, hi: 25 },
    { name: '精英', lo: 26, hi: 40 },
    { name: '战姬', lo: 41, hi: 55 },
    { name: '传奇', lo: 56, hi: 70 },
  ];
  // 魔人/魔物 · 深渊位格阶梯（数值曲线与魔法少女完全一致，仅称谓不同）
  const RANKS_DEMON = [
    { name: '孳生体', lo: 1, hi: 10 },
    { name: '蚀魂者', lo: 11, hi: 25 },
    { name: '化渊者', lo: 26, hi: 40 },
    { name: '噬星者', lo: 41, hi: 55 },
    { name: '渊厄', lo: 56, hi: 70 },
  ];
  function rankOfLevelIn(ladder, lv) {
    for (let i = 0; i < ladder.length; i++) {
      if (lv >= ladder[i].lo && lv <= ladder[i].hi) return ladder[i];
    }
    if (lv > 0 && lv < ladder[0].lo) return ladder[0];
    return ladder[ladder.length - 1];
  }
  function rankOfLevel(lv) {
    return rankOfLevelIn(RANKS, lv);
  }
  // 依「阶级」文字判定走哪套阶梯：写了位格名→魔人阶梯；写了少女阶名→少女阶梯；都没写则用 roleDemon 兜底
  function pickLadder(rk, roleDemon) {
    rk = String(rk || '');
    for (let i = 0; i < RANKS_DEMON.length; i++) {
      if (rk.indexOf(RANKS_DEMON[i].name) !== -1) return RANKS_DEMON;
    }
    for (let j = 0; j < RANKS.length; j++) {
      if (rk.indexOf(RANKS[j].name) !== -1) return RANKS;
    }
    return roleDemon ? RANKS_DEMON : RANKS;
  }
  function levelInfo(rankRaw, lvRaw, roleDemon) {
    const rk = String(rankRaw == null ? '' : rankRaw).trim();
    const lv = num(lvRaw, null);
    const ladder = pickLadder(rk, roleDemon);
    let rankObj = null;
    for (let i = 0; i < ladder.length; i++) {
      if (rk.indexOf(ladder[i].name) !== -1) {
        rankObj = ladder[i];
        break;
      }
    }
    if (!rankObj && lv != null) rankObj = rankOfLevelIn(ladder, lv);
    const name = rankObj ? rankObj.name : rk || ladder[0].name;
    const label = name + (lv != null ? ' · Lv.' + lv : '');
    const n = rankObj ? ladder.indexOf(rankObj) : -1;
    return { n: n, name: name, lv: lv, label: label, demon: ladder === RANKS_DEMON };
  }
  function condTone(text, hp) {
    const s = String(text == null ? '' : text);
    if (/重伤|濒死|垂死|命悬|剧毒|被擒|被困|走火入魔|危/.test(s) || hp <= 25) return 'bad';
    if (/受伤|带伤|疲|虚弱|狼狈|紧绷|中毒|憔悴/.test(s) || hp <= 55) return 'warn';
    return 'ok';
  }

  // ──────────────────────────── 洲域舆图 · 三层（洲域 / 城市 / 内景）──────────
  //  · 融入主题：墨色全部用 currentColor（随面板亮/暗自动反色），仅
  //    当前=紫(CUR) / 去向=琥珀(DEST) 为重点色。
  //  · 无连线：点与点之间不画路网，方位以淡墨山/水/界缝表达。
  //  · 内景：进入建筑/据点/拘留区后，自动细化到 楼层·房号 / 隔离室·审讯室 / 院落。
  const CUR = '#8b6fe6'; // 当前 —— 紫
  const DEST = '#e0a93a'; // 去向 —— 琥珀
  const FFAM = 'Kaiti SC,KaiTi,STKaiti,楷体,serif';

  // ── 地球版洲域：6 大洲（深渊废土已移除）──
  const ZONES = [
    {
      k: 'asia',
      name: '亚洲',
      kw: [
        '亚洲',
        '东亚',
        '东南亚',
        '南亚',
        '中亚',
        '西亚',
        '东京',
        '北京',
        '上海',
        '首尔',
        '新加坡',
        '曼谷',
        '迪拜',
        '伊斯坦布尔',
        '香港',
        '台北',
        '大阪',
        '京都',
        '吉隆坡',
        '孟买',
        '德里',
        '耶路撒冷',
        '德黑兰',
        '利雅得',
        '塔什干',
        '阿拉木图',
        '乌兰巴托',
        '河内',
        '雅加达',
        '马尼拉',
        '仰光',
        '金边',
        '万象',
        '加德满都',
        '科伦坡',
        '马累',
        '多哈',
        '阿布扎比',
        '科威特城',
        '巴格达',
        '大马士革',
        '安曼',
        '贝鲁特',
        '埃里温',
        '第比利斯',
        '巴库',
      ],
    },
    {
      k: 'europe',
      name: '欧洲',
      kw: [
        '欧洲',
        '西欧',
        '东欧',
        '南欧',
        '北欧',
        '伦敦',
        '巴黎',
        '柏林',
        '罗马',
        '马德里',
        '阿姆斯特丹',
        '布鲁塞尔',
        '维也纳',
        '布拉格',
        '雅典',
        '斯德哥尔摩',
        '奥斯陆',
        '哥本哈根',
        '赫尔辛基',
        '都柏林',
        '里斯本',
        '华沙',
        '布达佩斯',
        '莫斯科',
        '圣彼得堡',
        '基辅',
        '索菲亚',
        '布加勒斯特',
        '贝尔格莱德',
        '萨格勒布',
        '卢布尔雅那',
        '苏黎世',
        '日内瓦',
        '慕尼黑',
        '法兰克福',
        '汉堡',
        '米兰',
        '佛罗伦萨',
        '威尼斯',
        '巴塞罗那',
        '塞维利亚',
        '波尔图',
        '爱丁堡',
        '曼彻斯特',
        '雷克雅未克',
        '塔林',
        '里加',
        '维尔纽斯',
        '明斯克',
      ],
    },
    {
      k: 'namerica',
      name: '北美洲',
      kw: [
        '北美',
        '北美洲',
        '美国',
        '加拿大',
        '墨西哥',
        '华盛顿',
        '纽约',
        '洛杉矶',
        '芝加哥',
        '休斯顿',
        '旧金山',
        '西雅图',
        '波士顿',
        '迈阿密',
        '拉斯维加斯',
        '新奥尔良',
        '亚特兰大',
        '丹佛',
        '费城',
        '达拉斯',
        '多伦多',
        '温哥华',
        '蒙特利尔',
        '渥太华',
        '卡尔加里',
        '墨西哥城',
        '瓜达拉哈拉',
        '蒙特雷',
        '坎昆',
        '哈瓦那',
        '金斯顿',
        '圣多明各',
        '圣胡安',
      ],
    },
    {
      k: 'samerica',
      name: '南美洲',
      kw: [
        '南美',
        '南美洲',
        '巴西',
        '阿根廷',
        '智利',
        '秘鲁',
        '哥伦比亚',
        '里约热内卢',
        '圣保罗',
        '布宜诺斯艾利斯',
        '圣地亚哥',
        '利马',
        '波哥大',
        '加拉加斯',
        '基多',
        '拉巴斯',
        '亚松森',
        '蒙得维的亚',
        '乔治敦',
        '帕拉马里博',
        '库斯科',
        '马瑙斯',
        '萨尔瓦多',
        '累西腓',
        '阿雷格里港',
        '麦德林',
        '卡利',
        '瓜亚基尔',
        '康塞普西翁',
        '瓦尔帕莱索',
      ],
    },
    {
      k: 'africa',
      name: '非洲',
      kw: [
        '非洲',
        '北非',
        '撒哈拉',
        '开罗',
        '亚历山大',
        '拉各斯',
        '内罗毕',
        '约翰内斯堡',
        '开普敦',
        '比勒陀利亚',
        '亚的斯亚贝巴',
        '达喀尔',
        '阿比让',
        '阿克拉',
        '坎帕拉',
        '达累斯萨拉姆',
        '金沙萨',
        '罗安达',
        '马普托',
        '哈拉雷',
        '突尼斯',
        '阿尔及尔',
        '卡萨布兰卡',
        '拉巴特',
        '的黎波里',
        '班吉',
        '雅温得',
        '杜阿拉',
        '卢萨卡',
        '哈博罗内',
        '温得和克',
        '马塞卢',
        '姆巴巴内',
        '路易港',
        '维多利亚',
      ],
    },
    {
      k: 'oceania',
      name: '大洋洲',
      kw: [
        '大洋洲',
        '澳洲',
        '澳大利亚',
        '新西兰',
        '悉尼',
        '墨尔本',
        '布里斯班',
        '珀斯',
        '阿德莱德',
        '堪培拉',
        '霍巴特',
        '达尔文',
        '凯恩斯',
        '奥克兰',
        '惠灵顿',
        '基督城',
        '皇后镇',
        '哈密尔顿',
        '但尼丁',
        '陶朗加',
        '苏瓦',
        '努库阿洛法',
        '阿皮亚',
        '维拉港',
        '霍尼亚拉',
        '莫尔兹比港',
        '帕利基尔',
        '马久罗',
        '塔拉瓦',
        '亚伦',
      ],
    },
  ];
  function h32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function classifyZone(s) {
    s = String(s == null ? '' : s);
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i];
      for (let j = 0; j < z.kw.length; j++) {
        if (s.indexOf(z.kw[j]) !== -1) return z;
      }
    }
    return null;
  }
  function ink(op) {
    return 'fill="currentColor" opacity="' + op + '"';
  }
  function inkS(op, w) {
    return 'fill="none" stroke="currentColor" stroke-width="' + (w || 1) + '" opacity="' + op + '"';
  }

  // ===== 地点定位解析（域·地·内景） =====
  const LOCSEP = /[·•・\/>]/;
  // 地球版地名后缀：覆盖真实城市/区划常用后缀
  const PLACESUF =
    /(市|区|县|州|省|郡|都|府|道|半岛|岛|屿|群岛|湾|海峡|港|城|镇|村|堡|斯克|格勒|顿|斯坦|尼亚|兰|尔|特|加|拉|布|纳|科|夫|维奇|奇|什|德|里|亚|堡|顿|维尔|波利斯|敦|黎|马)$/;
  // ── 地球版：世界名城及其下属区域（真实行政区/地标商圈）──
  const KNOWN_PLACES = {
    // 亚洲
    东京: ['新宿', '涩谷', '银座', '秋叶原', '浅草', '池袋', '六本木', '上野'],
    北京: ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '通州区'],
    上海: ['浦东新区', '黄浦区', '静安区', '徐汇区', '长宁区', '虹口区'],
    首尔: ['江南区', '明洞', '弘大', '汝矣岛', '梨泰院', '东大门'],
    香港: ['中环', '尖沙咀', '铜锣湾', '旺角', '油麻地', '湾仔'],
    新加坡: ['滨海湾', '乌节路', '牛车水', '小印度', '克拉码头', '圣淘沙'],
    曼谷: ['素坤逸', '暹罗广场', '考山路', '是隆', '唐人街', '河滨'],
    迪拜: ['迪拜市中心', '朱美拉', '迪拜码头', '商务港', '德伊拉', '哈利法塔区'],
    伊斯坦布尔: ['苏丹艾哈迈德', '塔克西姆', '贝伊奥卢', '卡德柯伊', '于斯屈达尔'],
    孟买: ['南孟买', '班德拉', '安泰里', '朱湖', '下帕雷尔', '沃利'],
    // 欧洲
    伦敦: ['威斯敏斯特', '金融城', '苏豪区', '肯辛顿', '卡姆登', '格林尼治', '诺丁山'],
    巴黎: ['卢浮宫区', '香榭丽舍', '蒙马特', '拉丁区', '玛黑区', '拉德芳斯'],
    柏林: ['米特', '克罗伊茨贝格', '夏洛滕堡', '普伦茨劳尔贝格', '弗里德里希斯海因'],
    罗马: ['特米尼', '特拉斯提弗列', '纳沃纳', '西班牙广场', '梵蒂冈周边'],
    马德里: ['太阳门', '格兰大道', '萨拉曼卡', '马拉萨尼亚', '拉瓦皮耶斯'],
    阿姆斯特丹: ['运河带', '约旦', '德派普', '博物馆广场', '红灯区', '南轴'],
    莫斯科: ['红场区', '阿尔巴特', '特维尔', '麻雀山', '莫斯科城商务区'],
    圣彼得堡: ['冬宫区', '涅瓦大街', '彼得格勒区', '瓦西里岛', '海军部区'],
    雅典: ['普拉卡', '蒙纳斯提拉奇', '科洛纳基', '普西里', '宪法广场'],
    苏黎世: ['老城', '尼德多夫', '车站街', '西区', '奥利孔'],
    // 北美洲
    纽约: ['曼哈顿', '布鲁克林', '皇后区', '布朗克斯', '史泰登岛', '时代广场', '华尔街', '苏荷区'],
    洛杉矶: ['好莱坞', '比佛利山', '圣莫尼卡', '威尼斯海滩', '市中心', '西好莱坞'],
    芝加哥: ['卢普区', '河滨北', '林肯公园', '湖景', '南环', '西环'],
    旧金山: ['渔人码头', '金融区', '使命区', '卡斯特罗', '诺布山', '唐人街'],
    华盛顿: ['国会山', '乔治城', '杜邦圈', '亚当斯摩根', '雾谷', '海军船厂'],
    多伦多: ['市中心', '北约克', '士嘉堡', '怡陶碧谷', '约克维尔', '海滨中心'],
    温哥华: ['市中心', '基斯兰奴', '商业街', '耶鲁镇', '西端区', '列治文'],
    墨西哥城: ['历史中心', '波朗科', '科约阿坎', '罗马区', '孔德萨', '圣天使'],
    // 南美洲
    里约热内卢: ['科帕卡巴纳', '伊帕内玛', '莱布隆', '圣特蕾莎', '拉帕', '市中心'],
    圣保罗: ['保利斯塔', '希迪亚德', '维拉马达莱纳', '皮涅鲁斯', '利贝尔达德'],
    布宜诺斯艾利斯: ['雷科莱塔', '巴勒莫', '圣特尔莫', '马德罗港', '贝尔格拉诺', '卡巴利托'],
    利马: ['米拉弗洛雷斯', '巴兰科', '圣伊西德罗', '历史中心', '苏尔科'],
    波哥大: ['拉坎德拉里亚', '查皮内罗', '乌萨肯', '索阿查', '北蒂恩'],
    // 非洲
    开罗: ['解放广场', '扎马莱克', '吉萨', '科普特区', '赫利奥波利斯', '马阿迪'],
    拉各斯: ['维多利亚岛', '伊科伊', '拉各斯岛', '莱基', '亚巴'],
    内罗毕: ['市中心', '韦斯特兰', '基利姆', '卡伦', '兰加塔', '公园兰兹'],
    开普敦: ['市中心', '滨海绿点', '坎普斯湾', '克利夫顿', '伍德斯托克', '博卡普'],
    约翰内斯堡: ['桑顿', '玫瑰岸', '梅尔罗斯', '帕克敦', '米德兰', '索韦托'],
    // 大洋洲
    悉尼: ['CBD', '岩石区', '达令港', '邦迪', '帕兹角', '萨里山', '纽镇'],
    墨尔本: ['CBD', '南岸', '菲茨罗伊', '卡尔顿', '圣基尔达', '南雅拉', '港务区'],
    奥克兰: ['CBD', '庞森比', '帕奈尔', '德文波特', '纽马克特', '格林黑斯'],
  };
  function parseXYLoc(loc) {
    const segs = String(loc == null ? '' : loc)
      .split(LOCSEP)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    let domain = segs[0] || '',
      place = '',
      spot = '',
      ki = -1;
    for (let i = segs.length - 1; i >= 1; i--) {
      if (KNOWN_PLACES[segs[i]]) {
        ki = i;
        break;
      }
    }
    if (ki < 0) {
      for (let j = 1; j < segs.length; j++) {
        if (PLACESUF.test(segs[j])) {
          ki = j;
          break;
        }
      }
    }
    if (ki >= 1) {
      place = segs[ki];
      spot = segs.slice(ki + 1).join('·');
    } else if (segs.length >= 2) {
      place = segs[segs.length - 1];
      spot = '';
    }
    if (place === domain) place = '';
    return { domain: domain, place: place, spot: spot, segs: segs };
  }
  const XAREA_SECT = ['大学城', '训练场', '体育馆', '驻地', '哨站', '补给站', '研究院', '隔离区', '后勤区', '城墙'];
  const XAREA_CITY = ['商业街', '中央广场', '政务区', '老城区', '滨河大道', '集市', '公寓区', '咖啡街', '车站', '警局'];
  const XAREA_SEA = ['港区', '码头', '鱼市', '灯塔站', '海滩', '潮间带'];
  function genXYAreas(place, n) {
    let rng = makeRng(h32('城区·' + place)),
      pool;
    if (/海|岛|屿|港|湾|滩|滨|岸/.test(place)) pool = XAREA_SEA.slice();
    else if (/大学|学院|营|哨|训练|基地|军/.test(place)) pool = XAREA_SECT.slice();
    else pool = XAREA_CITY.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    return pool.slice(0, Math.max(1, Math.min(n, pool.length)));
  }
  function areaOfXY(area, place) {
    const segs = String(area == null ? '' : area)
      .split(LOCSEP)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!segs.length) return '';
    const idx = segs.indexOf(place);
    if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
    const last = segs[segs.length - 1];
    if (last && last !== place) return last;
    return '';
  }
  function placeAreas(place, pois) {
    const base = KNOWN_PLACES[place] ? KNOWN_PLACES[place].slice() : [];
    const seen = {};
    base.forEach(function (a) {
      seen[a] = 1;
    });
    const derived = [];
    (pois || []).forEach(function (p) {
      const a = areaOfXY(p.area || '', place);
      if (a && !seen[a]) {
        seen[a] = 1;
        derived.push(a);
      }
    });
    let areas = base.concat(derived);
    if (!areas.length) areas = genXYAreas(place, 5);
    else if (areas.length < 4) {
      const gen = genXYAreas(place, 6);
      for (let i = 0; i < gen.length && areas.length < 4; i++) {
        if (!seen[gen[i]]) {
          seen[gen[i]] = 1;
          areas.push(gen[i]);
        }
      }
    }
    return areas.slice(0, 6);
  }
  function placeArchetype(place, domain) {
    const P = place || '',
      D = domain || '';
    // 地球版：真实城市→地形原型映射
    const KA = {
      // 海滨/港口城市
      东京: 'sea',
      上海: 'sea',
      香港: 'sea',
      新加坡: 'sea',
      悉尼: 'sea',
      墨尔本: 'sea',
      温哥华: 'sea',
      旧金山: 'sea',
      洛杉矶: 'sea',
      里约热内卢: 'sea',
      开普敦: 'sea',
      奥克兰: 'sea',
      曼谷: 'sea',
      伊斯坦布尔: 'sea',
      雅典: 'sea',
      巴塞罗那: 'sea',
      拉各斯: 'sea',
      坎昆: 'sea',
      哈瓦那: 'sea',
      // 山城/高原城市
      墨西哥城: 'mountain',
      波哥大: 'mountain',
      基多: 'mountain',
      拉巴斯: 'mountain',
      亚的斯亚贝巴: 'mountain',
      内罗毕: 'mountain',
      丹佛: 'mountain',
      库斯科: 'mountain',
      // 谷地/盆地城市
      圣保罗: 'valley',
      // 古都/宫殿型城市
      北京: 'palace',
      罗马: 'palace',
      巴黎: 'palace',
      伦敦: 'palace',
      莫斯科: 'palace',
      圣彼得堡: 'palace',
      维也纳: 'palace',
      马德里: 'palace',
      开罗: 'palace',
      // 普通内陆/平原城市
      柏林: 'city',
      芝加哥: 'city',
      多伦多: 'city',
      法兰克福: 'city',
      慕尼黑: 'city',
      米兰: 'city',
      布宜诺斯艾利斯: 'city',
      约翰内斯堡: 'city',
      迪拜: 'city',
      首尔: 'city',
      孟买: 'city',
      纽约: 'city',
      华盛顿: 'city',
      休斯顿: 'city',
      达拉斯: 'city',
      亚特兰大: 'city',
      费城: 'city',
      波士顿: 'city',
      西雅图: 'city',
    };
    let base = KA[P];
    if (!base) {
      // 关键词推断（地球版）
      if (/海|岛|屿|港|湾|滩|滨|岸|峡|礁/.test(P)) base = 'sea';
      else if (/谷|盆|峡|原|漠|沙|戈|荒/.test(P)) base = 'valley';
      else if (/宫|殿|阙|皇|王|都|京|廷|堡/.test(P)) base = 'palace';
      else if (/市|镇|区|县|村|屯|郭|郊/.test(P)) base = 'city';
      else base = 'mountain';
    }
    let mod = 'normal';
    // 寒带/极地修饰
    if (/北欧|冰岛|西伯利亚|阿拉斯加|北极|南极|雷克雅未克|赫尔辛基|奥斯陆|斯德哥尔摩|莫斯科|圣彼得堡/.test(D + P))
      mod = 'snow';
    return { base: base, mod: mod };
  }
  function inferIcon(name, type) {
    const s = String(type || '') + ' ' + String(name || '');
    if (/会所|夜店|俱乐部|夜总会/.test(s)) return 'flower';
    if (/赌场|竞技场|博彩|游戏厅|卡西诺/.test(s)) return 'dice';
    if (/银行|金融|交易所|证券|股票/.test(s)) return 'coin';
    if (/医院|诊所|疗养|药|急救|医务/.test(s)) return 'med';
    if (/咖啡|奶茶|茶馆|甜品|烘焙/.test(s)) return 'tea';
    if (/酒吧|餐厅|食肆|居酒|旅馆|酒店|客栈/.test(s)) return 'inn';
    if (/大学|学院|图书|档案|博物馆/.test(s)) return 'book';
    if (/研究院|工坊|实验|工厂|制药/.test(s)) return 'pill';
    if (/训练|演武|体育馆|健身|靶场|猎区/.test(s)) return 'train';
    if (/拘留|隔离|看守|收容|监狱|牢/.test(s)) return 'lock';
    if (/码头|港|渡口|船坞|渡轮/.test(s)) return 'boat';
    if (/湖|泉|池|湾|滨|潭|河/.test(s)) return 'water';
    if (/峰|山|岭|崖|高原|丘陵/.test(s)) return 'peak';
    if (/百货|市集|商街|集市|商城|购物中心/.test(s)) return 'market';
    if (/教堂|寺|庙|神社|清真寺|纪念碑/.test(s)) return 'shrine';
    if (/关|城门|要塞|堡垒/.test(s)) return 'gate';
    if (/警局|市政|官署|政府|总部|署|局/.test(s)) return 'gov';
    if (/公寓|宿舍|住宅|楼|院|苑|台|殿|堂|阁|轩|大厦/.test(s)) return 'hall';
    return 'dot';
  }
  function iconPath(k) {
    switch (k) {
      case 'hall':
        return '<path d="M-6 -1 L0 -6 L6 -1"/><path d="M-4 -1 L-4 5 L4 5 L4 -1"/><path d="M-6 5 L6 5"/>';
      case 'gate':
        return '<path d="M-5 5 L-5 -2 M5 5 L5 -2 M-6.5 -2 L6.5 -2 M-2.5 -2 L-2.5 1 M2.5 -2 L2.5 1"/>';
      case 'peak':
        return '<path d="M-6 5 L-1.5 -5 L1 0 L3 -3 L6 5 Z"/>';
      case 'market':
        return '<path d="M-5 -3 L5 -3 L4 0 L-4 0 Z M-4 0 L-4 5 M4 0 L4 5 M-4 5 L4 5"/>';
      case 'train':
        return '<path d="M-5 -5 L5 5 M5 -5 L-5 5"/>';
      case 'book':
        return '<path d="M0 -4 L-5 -4 L-5 4 L0 5 Z M0 -4 L5 -4 L5 4 L0 5 M0 -4 L0 5"/>';
      case 'pill':
        return '<rect x="-5" y="-2.7" width="10" height="5.4" rx="2.7"/><path d="M0 -2.7 L0 2.7"/>';
      case 'med':
        return '<path d="M-4 0 L4 0 L2.8 5 L-2.8 5 Z M0 0 L0 -3 M-2 -3 L2 -3"/>';
      case 'inn':
        return '<path d="M-4 -3 L4 -3 L3 3 L-3 3 Z M4 -2 A2 2 0 0 1 4 2 M0 3 L0 5 M-2.4 5 L2.4 5"/>';
      case 'tea':
        return '<path d="M-4 -2 L4 -2 L3 3 L-3 3 Z M4 -1 A1.7 1.7 0 0 1 4 2.4 M-5 5 L5 5 M0 -2 L0 -5"/>';
      case 'dice':
        return '<rect x="-4.5" y="-4.5" width="9" height="9" rx="1.6"/><circle cx="-2" cy="-2" r="0.9"/><circle cx="2.2" cy="2.2" r="0.9"/><circle cx="2.2" cy="-2" r="0.9"/>';
      case 'coin':
        return '<circle cx="0" cy="0" r="5"/><rect x="-1.7" y="-1.7" width="3.4" height="3.4"/>';
      case 'lock':
        return '<rect x="-4" y="0" width="8" height="6" rx="1"/><path d="M-2.3 0 L-2.3 -2 A2.3 2.3 0 0 1 2.3 -2 L2.3 0"/>';
      case 'boat':
        return '<path d="M-6 1 Q0 6 6 1 Z"/><path d="M0 1 L0 -6 M0 -6 L4.6 -1.6 L0 -1.6"/>';
      case 'water':
        return '<path d="M0 -5 C3.6 -1 4 2.6 0 5 C-4 2.6 -3.6 -1 0 -5 Z"/>';
      case 'shrine':
        return '<path d="M-6 -2 L6 -2 M-5 -2 L-5 -3.6 L5 -3.6 L5 -2 M-4 -2 L-4 5 M4 -2 L4 5 M-4 5 L4 5"/>';
      case 'gov':
        return '<path d="M-5 5 L-5 -1 L0 -5 L5 -1 L5 5 Z M-2.5 5 L-2.5 1 L2.5 1 L2.5 5"/>';
      default:
        return '';
    }
  }
  function scatterN(n, bb, seedStr) {
    const rng = makeRng(h32(seedStr)),
      W = bb.x1 - bb.x0,
      H = bb.y1 - bb.y0;
    const minD = Math.max(70, Math.min(130, Math.sqrt((W * H) / Math.max(1, n)) * 0.94));
    let pts = [],
      tries = 0,
      cap = n * 140;
    while (pts.length < n && tries < cap) {
      let x = bb.x0 + W * rng(),
        y = bb.y0 + H * rng(),
        ok = true;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] - x,
          dy = pts[i][1] - y;
        if (dx * dx + dy * dy < minD * minD) {
          ok = false;
          break;
        }
      }
      if (ok) pts.push([x, y]);
      tries++;
    }
    if (pts.length < n) {
      let cols = Math.ceil(Math.sqrt(n)),
        rows = Math.ceil(n / cols),
        k = 0;
      pts = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          if (k >= n) break;
          pts.push([
            bb.x0 + W * ((c + 0.5) / cols) + (rng() * 2 - 1) * W * 0.05,
            bb.y0 + H * ((r + 0.5) / rows) + (rng() * 2 - 1) * H * 0.05,
          ]);
          k++;
        }
    }
    return pts;
  }

  // ════════════ 一层 · 世界地图（地球版 · 6 大洲）════════════
  let _XG = null;
  function xyGeom() {
    if (_XG) return _XG;
    function wig(a, b, n, amp, rng) {
      let out = [],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        L = Math.sqrt(dx * dx + dy * dy) || 1,
        nx = -dy / L,
        ny = dx / L,
        prev = 0;
      for (let i = 1; i < n; i++) {
        let t = i / n,
          mx = a[0] + dx * t,
          my = a[1] + dy * t,
          off = (rng() * 2 - 1) * amp;
        off = (off + prev) / 2 + (rng() * 2 - 1) * amp * 0.55;
        prev = off;
        out.push([+(mx + nx * off).toFixed(1), +(my + ny * off).toFixed(1)]);
      }
      return out;
    }
    const rcoast = (function () {
      let s = 305419896 >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    })();
    // 各洲简化轮廓锚点（手工近似真实大陆形状）
    const ANCHORS = {
      namerica: [
        [28, 58],
        [68, 44],
        [120, 38],
        [175, 46],
        [195, 62],
        [192, 88],
        [178, 110],
        [168, 138],
        [142, 152],
        [112, 162],
        [92, 152],
        [62, 128],
        [40, 98],
        [26, 76],
      ],
      samerica: [
        [118, 162],
        [152, 166],
        [182, 188],
        [186, 215],
        [172, 248],
        [152, 268],
        [128, 266],
        [110, 244],
        [100, 212],
        [104, 182],
      ],
      europe: [
        [232, 70],
        [248, 44],
        [282, 38],
        [318, 46],
        [334, 64],
        [326, 88],
        [302, 102],
        [278, 106],
        [252, 100],
        [236, 88],
      ],
      africa: [
        [244, 118],
        [278, 114],
        [318, 120],
        [332, 148],
        [330, 182],
        [312, 218],
        [286, 236],
        [262, 232],
        [246, 202],
        [238, 168],
        [240, 138],
      ],
      asia: [
        [334, 58],
        [368, 40],
        [420, 34],
        [472, 42],
        [488, 60],
        [486, 88],
        [470, 118],
        [448, 146],
        [418, 162],
        [388, 158],
        [362, 138],
        [346, 112],
        [338, 84],
      ],
      oceania: [
        [392, 212],
        [428, 204],
        [464, 214],
        [472, 236],
        [452, 258],
        [418, 262],
        [390, 248],
        [384, 228],
      ],
    };
    // 用噪声生成各洲多边形海岸线
    const poly = {};
    for (const k in ANCHORS) {
      let pts = ANCHORS[k],
        full = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length];
        full.push(a);
        const seg = wig(a, b, 4, 5, rcoast);
        full = full.concat(seg);
      }
      poly[k] = full;
    }
    function pathOf(pts) {
      let d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (let i = 1; i < pts.length; i++) d += ' L' + pts[i][0] + ' ' + pts[i][1];
      return d + ' Z';
    }
    function lineOf(pts) {
      let d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (let i = 1; i < pts.length; i++) d += ' L' + pts[i][0] + ' ' + pts[i][1];
      return d;
    }
    const label = {
      namerica: [100, 92],
      samerica: [142, 212],
      europe: [282, 70],
      africa: [288, 172],
      asia: [412, 88],
      oceania: [430, 234],
    };
    const slots = {
      namerica: [
        [58, 72],
        [92, 62],
        [128, 68],
        [162, 82],
        [78, 102],
        [118, 118],
        [150, 132],
      ],
      samerica: [
        [124, 182],
        [156, 192],
        [148, 218],
        [132, 242],
        [114, 206],
      ],
      europe: [
        [252, 58],
        [276, 70],
        [300, 62],
        [266, 88],
        [290, 86],
      ],
      africa: [
        [266, 138],
        [296, 144],
        [312, 172],
        [282, 192],
        [266, 168],
      ],
      asia: [
        [356, 62],
        [392, 56],
        [428, 62],
        [458, 72],
        [382, 92],
        [422, 108],
        [448, 128],
      ],
      oceania: [
        [406, 222],
        [436, 228],
        [426, 248],
      ],
    };
    const feature = {
      namerica: { name: '纽约', xy: [168, 92] },
      samerica: { name: '里约', xy: [176, 202] },
      europe: { name: '伦敦', xy: [236, 66] },
      africa: { name: '开罗', xy: [314, 126] },
      asia: { name: '东京', xy: [462, 70] },
      oceania: { name: '悉尼', xy: [456, 238] },
    };
    _XG = {
      poly: poly,
      label: label,
      slots: slots,
      feature: feature,
      pathOf: pathOf,
      lineOf: lineOf,
    };
    return _XG;
  }
  function xyBuildDomainSvg(byZone, curZone, curLoc) {
    const g = xyGeom(),
      order = ['namerica', 'samerica', 'europe', 'africa', 'asia', 'oceania'];
    let s = '<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">';
    s +=
      '<defs><filter id="xyrift" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>';
    // 海域底（极淡蓝）
    s += '<rect x="0" y="0" width="500" height="300" rx="12" ' + ink(0.035) + '/>';
    // 经纬网装饰（淡墨虚线）
    for (let lon = 60; lon < 500; lon += 60) {
      s += '<line x1="' + lon + '" y1="14" x2="' + lon + '" y2="286" ' + inkS(0.08, 0.6) + ' stroke-dasharray="2 6"/>';
    }
    for (let lat = 50; lat < 300; lat += 50) {
      s += '<line x1="14" y1="' + lat + '" x2="486" y2="' + lat + '" ' + inkS(0.08, 0.6) + ' stroke-dasharray="2 6"/>';
    }
    // 各洲填色 / 描边
    for (let z = 0; z < order.length; z++) {
      const k = order[z],
        isCur = curZone && curZone.k === k;
      s +=
        '<path d="' +
        g.pathOf(g.poly[k]) +
        '" fill="' +
        (isCur ? CUR : 'currentColor') +
        '" fill-opacity="' +
        (isCur ? 0.14 : 0.07) +
        '" stroke="' +
        (isCur ? CUR : 'currentColor') +
        '" stroke-opacity="' +
        (isCur ? 0.9 : 0.32) +
        '" stroke-width="' +
        (isCur ? 2 : 1) +
        '" stroke-linejoin="round"/>';
    }
    // 大洲名
    for (let z2 = 0; z2 < order.length; z2++) {
      var k2 = order[z2],
        lp = g.label[k2],
        cur2 = curZone && curZone.k === k2;
      s +=
        '<text x="' +
        lp[0] +
        '" y="' +
        lp[1] +
        '" font-size="11.5" font-weight="700" letter-spacing="2" fill="' +
        (cur2 ? CUR : 'currentColor') +
        '" opacity="' +
        (cur2 ? 1 : 0.78) +
        '" font-family="' +
        FFAM +
        '">' +
        ZONES.filter(function (z) {
          return z.k === k2;
        })[0].name +
        '</text>';
    }
    // 标志性地物（恒在）
    for (const k3 in g.feature) {
      const ft = g.feature[k3];
      s +=
        '<path d="M' +
        (ft.xy[0] - 3) +
        ' ' +
        ft.xy[1] +
        ' L' +
        ft.xy[0] +
        ' ' +
        (ft.xy[1] - 3.4) +
        ' L' +
        (ft.xy[0] + 3) +
        ' ' +
        ft.xy[1] +
        ' L' +
        ft.xy[0] +
        ' ' +
        (ft.xy[1] + 3.4) +
        ' Z" ' +
        inkS(0.5, 1) +
        '/>';
      s +=
        '<text x="' +
        ft.xy[0] +
        '" y="' +
        (ft.xy[1] + 12) +
        '" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.52" font-family="' +
        FFAM +
        '">' +
        esc(ft.name) +
        '</text>';
    }
    // 动态 POI（淡墨点）
    let pin = null;
    for (let z3 = 0; z3 < order.length; z3++) {
      let k4 = order[z3],
        slotsK = g.slots[k4],
        list = (byZone[k4] || []).slice();
      list.sort(function (a, b) {
        return (b.inLoc ? 1 : 0) - (a.inLoc ? 1 : 0);
      });
      list = list.slice(0, slotsK.length);
      const used = {};
      for (let p = 0; p < list.length; p++) {
        let po = list[p],
          idx = h32(po.name) % slotsK.length,
          tries = 0;
        while (used[idx] && tries < slotsK.length) {
          idx = (idx + 1) % slotsK.length;
          tries++;
        }
        used[idx] = true;
        const pt = slotsK[idx],
          label2 = po.name.length > 5 ? po.name.slice(0, 4) + '…' : po.name;
        s += '<circle cx="' + pt[0] + '" cy="' + (pt[1] - 4) + '" r="2.6" fill="currentColor" opacity="0.55"/>';
        s +=
          '<text x="' +
          pt[0] +
          '" y="' +
          (pt[1] + 8) +
          '" text-anchor="middle" font-size="8.5" fill="currentColor" opacity="0.78" font-family="' +
          FFAM +
          '">' +
          esc(label2) +
          '</text>';
        if (po.inLoc && !pin) pin = [pt[0], pt[1] - 4];
      }
      if (curZone && curZone.k === k4 && !pin) {
        const lp2 = g.label[k4];
        pin = [g.feature[k4] ? g.feature[k4].xy[0] : lp2[0] + 40, g.feature[k4] ? g.feature[k4].xy[1] : lp2[1] + 20];
      }
    }
    if (pin) {
      s +=
        '<circle cx="' + pin[0] + '" cy="' + pin[1] + '" r="8.5" fill="' + CUR + '" opacity="0.26" class="xysb-ping"/>';
      s +=
        '<circle cx="' +
        pin[0] +
        '" cy="' +
        pin[1] +
        '" r="4.4" fill="' +
        CUR +
        '" stroke="#fff" stroke-width="1.4" stroke-opacity="0.85"/>';
    }
    s +=
      '<g transform="translate(34,272)" opacity="0.55"><circle r="9" ' +
      inkS(1, 1) +
      '/><path d="M0 -7 L2.6 0 L0 7 L-2.6 0 Z" fill="currentColor"/><text y="-11" text-anchor="middle" font-size="7" fill="currentColor">北</text></g>';
    s += '</svg>';
    return s;
  }

  // ════════════ 二层 · 城市（城区内部；无连线，淡墨山水地标）════════════
  function markerSvgT(x, y, iconKey, label, kind) {
    let r = kind === 'cur' ? 13 : 11,
      s = '';
    if (kind === 'cur')
      s +=
        '<circle cx="' +
        x.toFixed(1) +
        '" cy="' +
        y.toFixed(1) +
        '" r="' +
        (r + 6) +
        '" fill="' +
        CUR +
        '" opacity="0.16" class="xysb-ping"/>';
    const ringCol = kind === 'cur' ? CUR : kind === 'dest' ? DEST : 'currentColor';
    const ringOp = kind === 'cur' ? 1 : kind === 'dest' ? 1 : 0.42;
    // 牌底
    if (kind === 'cur')
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + CUR + '"/>';
    else
      s +=
        '<circle cx="' +
        x.toFixed(1) +
        '" cy="' +
        y.toFixed(1) +
        '" r="' +
        r +
        '" fill="currentColor" fill-opacity="0.07"/>';
    s +=
      '<circle cx="' +
      x.toFixed(1) +
      '" cy="' +
      y.toFixed(1) +
      '" r="' +
      r +
      '" fill="none" stroke="' +
      ringCol +
      '" stroke-opacity="' +
      ringOp +
      '" stroke-width="' +
      (kind === 'cur' ? 2 : 1.5) +
      '"/>';
    const glyph = kind === 'cur' ? '#fff' : kind === 'dest' ? DEST : 'currentColor';
    const glyphOp = kind === 'cur' ? 0.92 : kind === 'dest' ? 1 : 0.72;
    if (iconKey === 'dot')
      s +=
        '<circle cx="' +
        x.toFixed(1) +
        '" cy="' +
        y.toFixed(1) +
        '" r="2.8" fill="' +
        glyph +
        '" opacity="' +
        glyphOp +
        '"/>';
    else if (iconKey === 'flower')
      s +=
        '<g transform="translate(' +
        x.toFixed(1) +
        ',' +
        y.toFixed(1) +
        ') scale(0.82)" fill="' +
        glyph +
        '" opacity="' +
        glyphOp +
        '"><circle cx="0" cy="-3.4" r="1.9"/><circle cx="3.2" cy="-1" r="1.9"/><circle cx="2" cy="3" r="1.9"/><circle cx="-2" cy="3" r="1.9"/><circle cx="-3.2" cy="-1" r="1.9"/><circle cx="0" cy="0" r="1.3"/></g>';
    else
      s +=
        '<g transform="translate(' +
        x.toFixed(1) +
        ',' +
        y.toFixed(1) +
        ') scale(0.84)" fill="none" stroke="' +
        glyph +
        '" stroke-opacity="' +
        glyphOp +
        '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        iconPath(iconKey) +
        '</g>';
    if (kind === 'dest')
      s +=
        '<g transform="translate(' +
        (x + r - 2).toFixed(1) +
        ',' +
        (y - r + 1).toFixed(1) +
        ')"><path d="M0 3 L0 -9" stroke="' +
        DEST +
        '" stroke-width="1.4"/><path d="M0 -9 L9 -6.5 L0 -3.5 Z" fill="' +
        DEST +
        '"/></g>';
    const lab = label.length > 7 ? label.slice(0, 6) + '…' : label;
    const lcol = kind === 'cur' ? CUR : kind === 'dest' ? DEST : 'currentColor';
    const lop = kind === 'cur' || kind === 'dest' ? 1 : 0.85;
    const fw = kind === 'cur' || kind === 'dest' ? '700' : '600';
    s +=
      '<text x="' +
      x.toFixed(1) +
      '" y="' +
      (y + r + 12).toFixed(1) +
      '" text-anchor="middle" font-size="10.5" font-weight="' +
      fw +
      '" letter-spacing="0.5" fill="' +
      lcol +
      '" opacity="' +
      lop +
      '" font-family="' +
      FFAM +
      '">' +
      (kind === 'dest' ? '去 ' : '') +
      esc(lab) +
      '</text>';
    return s;
  }
  function xyBuildWardSvg(place, pois, curSpot, rawLoc, dest, domain) {
    if (!place) {
      let s0 = '<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">';
      s0 += '<rect width="500" height="300" rx="12" ' + ink(0.04) + '/>';
      s0 +=
        '<text x="250" y="146" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.55" font-family="' +
        FFAM +
        '">行踪未及具体城池</text>';
      s0 +=
        '<text x="250" y="172" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.4" font-family="' +
        FFAM +
        '">可切「洲域」纵览全局</text>';
      s0 += '</svg>';
      return s0;
    }
    pois = pois || [];
    const arch = placeArchetype(place, domain || ''),
      base = arch.base,
      mod = arch.mod;
    let areas = placeAreas(place, pois),
      seen = {},
      points = [];
    function addPt(name, type) {
      if (!name) return -1;
      if (seen[name]) return -1;
      seen[name] = 1;
      points.push({ name: name, icon: inferIcon(name, type) });
      return points.length - 1;
    }
    areas.forEach(function (a) {
      addPt(a, '');
    });
    pois.forEach(function (p) {
      addPt(p.name, p.type);
    });
    const curName = String(curSpot || '');
    if (curName) {
      // 城市层只标到「内景的第一段」（建筑/街巷），更深的楼层房号留给内景层
      const curHead = curName.split('·')[0];
      let ci = -1;
      for (let i = 0; i < points.length; i++) {
        const pn = points[i].name;
        if (pn === curHead || pn.indexOf(curHead) !== -1 || curHead.indexOf(pn) !== -1) {
          ci = i;
          break;
        }
      }
      if (ci < 0) ci = addPt(curHead, '');
      if (ci >= 0) points[ci].cur = true;
    }
    const dp = parseXYLoc(dest || ''),
      destName = dest && dp.place === place ? String(dp.spot || '').split('·')[0] : '';
    if (destName) {
      let di2 = -1;
      for (let j = 0; j < points.length; j++) {
        const pj = points[j].name;
        if (pj === destName || pj.indexOf(destName) !== -1 || destName.indexOf(pj) !== -1) {
          di2 = j;
          break;
        }
      }
      if (di2 < 0) di2 = addPt(destName, '');
      if (di2 >= 0 && !points[di2].cur) points[di2].dest = true;
    }
    if (points.length > 9) {
      const keep = points.filter(function (p) {
        return p.cur || p.dest;
      });
      const rest = points
        .filter(function (p) {
          return !(p.cur || p.dest);
        })
        .slice(0, Math.max(0, 9 - keep.length));
      points = keep.concat(rest);
    }
    if (!points.length) points.push({ name: place, icon: inferIcon(place, ''), cur: true });

    const bb = { x0: 56, y0: 50, x1: 444, y1: 246 };
    const pos = scatterN(points.length, bb, '坊点·' + place);
    let cx = (bb.x0 + bb.x1) / 2,
      cy = (bb.y0 + bb.y1) / 2,
      curIdx = -1;
    for (let i2 = 0; i2 < points.length; i2++) {
      if (points[i2].cur) {
        curIdx = i2;
        break;
      }
    }
    if (curIdx >= 0) {
      let bestP = 0,
        bd = 1e9;
      for (let pi = 0; pi < pos.length; pi++) {
        const dx = pos[pi][0] - cx,
          dy = pos[pi][1] - cy,
          d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          bestP = pi;
        }
      }
      const tmp = pos[0];
      pos[0] = pos[bestP];
      pos[bestP] = tmp;
      const tp = points[0];
      points[0] = points[curIdx];
      points[curIdx] = tp;
    }

    let s = '<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><clipPath id="xyl-clip"><rect x="2" y="2" width="496" height="296" rx="12"/></clipPath></defs>';
    s += '<rect width="500" height="300" rx="12" ' + ink(0.04) + '/>';
    s += '<g clip-path="url(#xyl-clip)">';
    // —— 淡墨地形地标（替代连线：山、水、谷、轴）——
    const tr = makeRng(h32('地形·' + place));
    if (base === 'sea') {
      s +=
        '<path d="M70 150 Q160 70 250 96 Q360 128 432 110 Q470 150 432 196 Q330 236 250 210 Q150 232 78 198 Q44 168 70 150 Z" ' +
        ink(0.05) +
        '/>';
      for (let wi = 0; wi < 6; wi++) {
        const wx = 24 + tr() * 452,
          wy = 26 + tr() * 250;
        s += '<path d="M' + wx.toFixed(0) + ' ' + wy.toFixed(0) + ' q5 -4 10 0 q5 4 10 0" ' + inkS(0.16, 1.1) + '/>';
      }
      s +=
        '<text x="250" y="150" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.22" font-family="' +
        FFAM +
        '">沧 海</text>';
    } else if (base === 'mountain') {
      for (let pk = 0; pk < 3; pk++) {
        const px = 90 + pk * 160 + tr() * 30,
          py = 72;
        s +=
          '<path d="M' +
          (px - 30) +
          ' ' +
          (py + 30) +
          ' L' +
          px +
          ' ' +
          (py - 18) +
          ' L' +
          (px + 30) +
          ' ' +
          (py + 30) +
          ' Z" ' +
          ink(0.08) +
          '/>';
      }
      s += '<path d="M30 235 Q150 205 250 222 T472 212" ' + inkS(0.2, 2) + ' stroke-dasharray="2 6"/>';
      s +=
        '<text x="250" y="60" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.22" font-family="' +
        FFAM +
        '">群 峰</text>';
    } else if (base === 'valley') {
      s += '<path d="M0 46 Q130 22 250 42 T500 40 L500 0 L0 0 Z" ' + ink(0.06) + '/>';
      s += '<path d="M0 256 Q140 280 250 262 T500 262 L500 300 L0 300 Z" ' + ink(0.06) + '/>';
      s += '<path d="M14 150 Q150 132 250 152 T486 150" ' + inkS(0.2, 3) + ' stroke-linecap="round"/>';
      s +=
        '<text x="250" y="150" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.2" font-family="' +
        FFAM +
        '">溪 涧</text>';
    } else if (base === 'palace') {
      s += '<line x1="250" y1="20" x2="250" y2="280" ' + inkS(0.18, 2) + ' stroke-dasharray="3 6"/>';
    } else {
      const ry = 86 + tr() * 110;
      s +=
        '<path d="M-8 ' +
        ry.toFixed(0) +
        ' C120 ' +
        (ry - 36 + tr() * 72).toFixed(0) +
        ', 320 ' +
        (ry + 46 - tr() * 80).toFixed(0) +
        ', 508 ' +
        (ry - 8).toFixed(0) +
        '" ' +
        inkS(0.18, 7) +
        ' stroke-linecap="round"/>';
    }
    if (mod === 'demon' && base !== 'sea') {
      for (let em = 0; em < 5; em++)
        s +=
          '<circle cx="' +
          (32 + tr() * 436).toFixed(0) +
          '" cy="' +
          (30 + tr() * 240).toFixed(0) +
          '" r="1.2" fill="currentColor" opacity="0.14"/>';
    } else if (mod === 'snow') {
      for (let sn = 0; sn < 6; sn++)
        s +=
          '<circle cx="' +
          (28 + tr() * 444).toFixed(0) +
          '" cy="' +
          (26 + tr() * 244).toFixed(0) +
          '" r="1.1" fill="currentColor" opacity="0.16"/>';
    }

    // —— 地点标记（无连线）——
    for (let mi = 0; mi < points.length; mi++) {
      const pt = points[mi],
        kind = pt.cur ? 'cur' : pt.dest ? 'dest' : '';
      s += markerSvgT(pos[mi][0], pos[mi][1], pt.icon, pt.name, kind);
    }
    s += '</g>';
    s += '<rect x="2" y="2" width="496" height="296" rx="12" ' + inkS(0.4, 1.4) + ' stroke-dasharray="4 5"/>';
    s +=
      '<text x="491" y="291" text-anchor="end" font-size="9" fill="currentColor" opacity="0.5" letter-spacing="2" font-family="' +
      FFAM +
      '">' +
      esc(place) +
      ' · 城区图</text>';
    s +=
      '<g transform="translate(476,26)" opacity="0.55"><path d="M0 -8 L3.4 6 L0 2.4 L-3.4 6 Z" fill="currentColor"/><text y="-10" text-anchor="middle" font-size="7" fill="currentColor">北</text></g>';
    s += '</svg>';
    return s;
  }

  // ════════════ 三层 · 细部（建筑/据点/牢狱内部）════════════
  const CN_NUM = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  function cnNum(s) {
    s = String(s || '');
    const m = s.match(/-?\d+/);
    if (m) return parseInt(m[0], 10);
    if (/^十/.test(s)) {
      const r = s.replace('十', '');
      return 10 + (CN_NUM[r[0]] || 0);
    }
    const t = s.match(/(.)十(.)?/);
    if (t) return (CN_NUM[t[1]] || 1) * 10 + (t[2] ? CN_NUM[t[2]] || 0 : 0);
    for (const k in CN_NUM) {
      if (s.indexOf(k) !== -1) return CN_NUM[k];
    }
    return null;
  }
  const FLOOR_RE = /(楼|层)$/,
    ROOM_RE = /(房|间|室|榻|铺|号|舍|窝|窟|监|牢)$/;
  const PRISON_RE = /拘留|隔离|看守|收容|禁闭|审讯|封印室|牢|囚/;
  const INN_RE = /客栈|酒店|旅馆|公寓|宿舍|咖啡|奶茶|茶楼|餐厅|酒吧|商城|百货|学院楼|栈/;
  function resolveScene(P, destStr, typeByName) {
    const spot = P.spot || '';
    if (!spot) return null;
    const segs = spot
      .split(LOCSEP)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!segs.length) return null;
    const building = segs[0],
      deep = segs[segs.length - 1],
      whole = spot;
    const bType = (typeByName && typeByName[building]) || '';
    let kind = null;
    if (PRISON_RE.test(whole) || /拘留|隔离|收容|囚|牢/.test(bType)) kind = 'prison';
    else if (/府第|宅院|庭院|别院|别苑|道观|宗祠|祠堂|山门|王府|公馆|大宅/.test(whole)) kind = 'manor';
    else if (
      segs.some(function (x) {
        return FLOOR_RE.test(x);
      }) ||
      ROOM_RE.test(deep) ||
      INN_RE.test(building + ' ' + bType)
    )
      kind = 'building';
    else if (/[殿阁斋轩]|庙$|寺$/.test(whole) && segs.length >= 2) kind = 'manor';
    else return null;
    // 去向同建筑时的目标内景
    let dp = parseXYLoc(destStr || ''),
      destDeep = '';
    if (destStr && dp.place === P.place && dp.spot) {
      const ds = dp.spot.split('·');
      if (ds[0] === building) destDeep = ds[ds.length - 1];
    }
    return {
      kind: kind,
      building: building,
      segs: segs,
      deep: deep,
      place: P.place,
      dest: destDeep,
      type: bType,
      sig: kind + '|' + spot,
    };
  }
  function frameWrap(inner, title) {
    let s = '<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect width="500" height="300" rx="12" ' + ink(0.04) + '/>';
    s += inner;
    s += '<rect x="2" y="2" width="496" height="296" rx="12" ' + inkS(0.4, 1.4) + ' stroke-dasharray="4 5"/>';
    s +=
      '<text x="491" y="291" text-anchor="end" font-size="9" fill="currentColor" opacity="0.5" letter-spacing="1.5" font-family="' +
      FFAM +
      '">' +
      esc(title) +
      '</text>';
    s += '</svg>';
    return s;
  }
  function roomCell(x, y, w, h, name, kind) {
    let s = '',
      isCur = kind === 'cur',
      isDest = kind === 'dest';
    const stroke = isCur ? CUR : isDest ? DEST : 'currentColor',
      sOp = isCur ? 1 : isDest ? 1 : 0.4,
      sW = isCur ? 2 : 1.2;
    if (isCur)
      s +=
        '<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        h +
        '" rx="3" fill="' +
        CUR +
        '" opacity="0.16"/>';
    s +=
      '<rect x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" rx="3" fill="' +
      (isCur ? CUR : 'currentColor') +
      '" fill-opacity="' +
      (isCur ? 0.14 : 0.05) +
      '" stroke="' +
      stroke +
      '" stroke-opacity="' +
      sOp +
      '" stroke-width="' +
      sW +
      '"/>';
    if (isCur)
      s +=
        '<circle cx="' +
        (x + w / 2).toFixed(1) +
        '" cy="' +
        (y + h / 2 - 3).toFixed(1) +
        '" r="9" fill="' +
        CUR +
        '" opacity="0.18" class="xysb-ping"/>';
    const lcol = isCur ? CUR : isDest ? DEST : 'currentColor',
      lop = isCur || isDest ? 1 : 0.8;
    const lab = name.length > 5 ? name.slice(0, 4) + '…' : name;
    s +=
      '<text x="' +
      (x + w / 2).toFixed(1) +
      '" y="' +
      (y + h / 2 + 4).toFixed(1) +
      '" text-anchor="middle" font-size="11" font-weight="' +
      (isCur ? 700 : 500) +
      '" fill="' +
      lcol +
      '" opacity="' +
      lop +
      '" font-family="' +
      FFAM +
      '">' +
      (isDest ? '去·' : '') +
      esc(lab) +
      '</text>';
    return s;
  }
  function matchName(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (!a || !b) return false;
    return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
  }
  function buildFloors(sc) {
    let floorSeg = '',
      room = '';
    for (let i = 0; i < sc.segs.length; i++) {
      if (FLOOR_RE.test(sc.segs[i])) floorSeg = sc.segs[i];
    }
    if (ROOM_RE.test(sc.deep)) room = sc.deep;
    else if (sc.deep !== sc.building && !FLOOR_RE.test(sc.deep)) room = sc.deep;
    const curFloor = floorSeg ? cnNum(floorSeg) || 1 : 1;
    const nFloors = Math.max(2, Math.min(4, Math.max(curFloor, floorSeg ? curFloor : 3)));
    const isInn = INN_RE.test(sc.building + ' ' + sc.type);
    // 房间名池（现代场景：按建筑类型给贴合的房间/区域名，不用修仙那一套）
    let _bld = sc.building + ' ' + sc.type,
      roomPool;
    if (/咖啡|奶茶|茶饮|餐厅|饭|食堂|小吃|酒吧|甜品|烘焙|快餐|店$|馆$/.test(_bld))
      roomPool = ['前厅', '卡座', '包间', '吧台', '取餐区', '洗手间'];
    else if (/商城|百货|商场|购物|广场|超市|mall/i.test(_bld))
      roomPool = ['中庭', '店铺', '收银台', '扶梯口', '仓储区', '洗手间'];
    else if (/医院|诊所|疗养|急诊|卫生/.test(_bld)) roomPool = ['大厅', '走廊', '诊室', '病房', '护士站', '检验科'];
    else if (/警局|市政|学院|学校|大学|研究院|实验室|办公|公司|局$|署$|中心/.test(_bld))
      roomPool = ['前台', '大厅', '办公室', '会议室', '休息区', '资料室'];
    else if (/公寓|宿舍|酒店|旅馆|民宿|楼|栋|大厦|寓|家$|房$/.test(_bld))
      roomPool = ['大堂', '走廊', '电梯厅', '客厅', '卧室', '阳台'];
    else roomPool = ['大厅', '走廊', '前厅', '休息区', '储物间', '洗手间'];
    const rooms = [];
    if (room) rooms.push(room);
    for (let rp = 0; rp < roomPool.length && rooms.length < 5; rp++) {
      if (!matchName(roomPool[rp], room)) rooms.push(roomPool[rp]);
    }
    // 画
    const topY = 40,
      botY = 250,
      fh = (botY - topY) / nFloors,
      lx = 70,
      rx = 446,
      ww = rx - lx;
    let inner = '';
    // 屋檐
    inner +=
      '<path d="M' +
      (lx - 16) +
      ' ' +
      topY +
      ' L258 ' +
      (topY - 22) +
      ' L' +
      (rx + 16) +
      ' ' +
      topY +
      ' Z" ' +
      ink(0.1) +
      '/>';
    inner +=
      '<path d="M' +
      (lx - 16) +
      ' ' +
      topY +
      ' L258 ' +
      (topY - 22) +
      ' L' +
      (rx + 16) +
      ' ' +
      topY +
      ' Z" ' +
      inkS(0.3, 1.2) +
      '/>';
    // 楼层带（从上到下：顶楼在上）
    for (let f = 0; f < nFloors; f++) {
      const floorNo = nFloors - f,
        y = topY + f * fh,
        isCurF = floorNo === curFloor;
      inner +=
        '<rect x="' +
        lx +
        '" y="' +
        y.toFixed(1) +
        '" width="' +
        ww +
        '" height="' +
        (fh - 4).toFixed(1) +
        '" rx="2" fill="' +
        (isCurF ? CUR : 'currentColor') +
        '" fill-opacity="' +
        (isCurF ? 0.05 : 0.03) +
        '" stroke="currentColor" stroke-opacity="' +
        (isCurF ? 0.34 : 0.22) +
        '" stroke-width="1"/>';
      inner +=
        '<text x="' +
        (lx - 8) +
        '" y="' +
        (y + fh / 2).toFixed(1) +
        '" text-anchor="end" font-size="10" fill="' +
        (isCurF ? CUR : 'currentColor') +
        '" opacity="' +
        (isCurF ? 1 : 0.55) +
        '" font-family="' +
        FFAM +
        '">' +
        (floorNo === 1 ? '一楼' : (['', '一', '二', '三', '四', '五', '六'][floorNo] || floorNo) + '楼') +
        '</text>';
      if (isCurF) {
        // 当前层铺房间
        const n = rooms.length,
          gap = 8,
          cw = (ww - gap * (n + 1)) / n,
          ryy = y + 7,
          rhh = fh - 18;
        for (let ri = 0; ri < n; ri++) {
          const rxx = lx + gap + ri * (cw + gap);
          const rk =
            matchName(rooms[ri], room) && room ? 'cur' : matchName(rooms[ri], sc.dest) && sc.dest ? 'dest' : '';
          inner += roomCell(rxx, ryy, cw, rhh, rooms[ri], rk);
        }
        if (!room)
          inner +=
            '<text x="258" y="' +
            (y + fh / 2 + 4).toFixed(1) +
            '" text-anchor="middle" font-size="10" fill="' +
            CUR +
            '" font-family="' +
            FFAM +
            '">（在此楼内）</text>';
      } else {
        // 其他层暗示隔间
        for (let di = 1; di <= 4; di++) {
          const dxx = lx + (ww * di) / 5;
          inner +=
            '<line x1="' +
            dxx.toFixed(1) +
            '" y1="' +
            (y + 4).toFixed(1) +
            '" x2="' +
            dxx.toFixed(1) +
            '" y2="' +
            (y + fh - 8).toFixed(1) +
            '" ' +
            inkS(0.14, 1) +
            '/>';
        }
      }
    }
    // 楼梯（右侧细线）
    inner +=
      '<path d="M' +
      (rx - 2) +
      ' ' +
      (topY + 6) +
      ' L' +
      (rx - 2) +
      ' ' +
      (botY - 6) +
      '" ' +
      inkS(0.18, 1) +
      ' stroke-dasharray="3 3"/>';
    inner +=
      '<text x="258" y="' +
      (topY - 8) +
      '" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" opacity="0.6" letter-spacing="2" font-family="' +
      FFAM +
      '">' +
      esc(sc.building) +
      '</text>';
    return frameWrap(inner, sc.building + ' · 楼层图');
  }
  function buildPrison(sc) {
    // 找出当前囚室标识（甲/乙/丙… 或 一/二/三 号）
    const cur = sc.deep,
      place = sc.place;
    let facility = sc.building;
    for (let i = 0; i < sc.segs.length; i++) {
      if (PRISON_RE.test(sc.segs[i]) && !ROOM_RE.test(sc.segs[i])) facility = sc.segs[i];
    }
    // 牢房池
    const marks = ['甲', '乙', '丙', '丁', '戊', '己'];
    let curMark = '';
    for (let m = 0; m < marks.length; m++) {
      if (cur.indexOf(marks[m]) !== -1) {
        curMark = marks[m];
        break;
      }
    }
    const cells = [];
    for (let c = 0; c < 5; c++) cells.push(marks[c] + '字隔离室');
    if (curMark) {
      /* 已在池中 */
    } else if (ROOM_RE.test(cur) && cur !== facility) {
      cells[2] = cur;
      curMark = '__C2';
    }
    // 画：上方一排牢房 + 走廊 + 下方功能间
    let inner = '';
    const topY = 50,
      ch = 78,
      cellN = 5,
      lx = 28,
      rx = 472,
      gap = 7,
      cw = (rx - lx - gap * (cellN + 1)) / cellN;
    inner +=
      '<text x="250" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" opacity="0.6" letter-spacing="2" font-family="' +
      FFAM +
      '">' +
      esc(facility) +
      '</text>';
    for (let ci = 0; ci < cellN; ci++) {
      const cxx = lx + gap + ci * (cw + gap);
      const nm = cells[ci];
      const isCur = (curMark && curMark !== '__C2' && nm.indexOf(curMark) === 0) || (curMark === '__C2' && ci === 2);
      const kind = isCur ? 'cur' : '';
      inner += roomCell(cxx, topY, cw, ch, nm, kind);
      // 铁栏（牢门）
      for (let b = 1; b <= 4; b++) {
        const bx = cxx + (cw * b) / 5;
        inner +=
          '<line x1="' +
          bx.toFixed(1) +
          '" y1="' +
          (topY + ch - 16) +
          '" x2="' +
          bx.toFixed(1) +
          '" y2="' +
          (topY + ch) +
          '" stroke="' +
          (isCur ? CUR : 'currentColor') +
          '" stroke-opacity="' +
          (isCur ? 0.8 : 0.32) +
          '" stroke-width="1.4"/>';
      }
    }
    // 走廊
    const corrY = topY + ch + 10;
    inner += '<rect x="' + lx + '" y="' + corrY + '" width="' + (rx - lx) + '" height="26" rx="3" ' + ink(0.045) + '/>';
    inner +=
      '<text x="250" y="' +
      (corrY + 17) +
      '" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.45" letter-spacing="3" font-family="' +
      FFAM +
      '">甬 道</text>';
    // 功能间
    const fY = corrY + 36,
      fh2 = 250 - fY,
      fns = ['审讯室', '收容间', '隔离区入口'],
      fn = fns.length,
      fgap = 7,
      fw = (rx - lx - fgap * (fn + 1)) / fn;
    for (let fi = 0; fi < fn; fi++) {
      const fxx = lx + fgap + fi * (fw + fgap);
      inner += roomCell(fxx, fY, fw, fh2, fns[fi], '');
    }
    return frameWrap(inner, facility + ' · 拘留区图');
  }
  function buildManor(sc) {
    const cur = sc.deep,
      court = sc.building;
    // 节点：门 → 前厅 → 正堂 → 后院；东西厢
    const axis = [];
    // 用 segs 里的有意义节点 + 通用补齐
    const named = sc.segs.slice(0).filter(function (x) {
      return x !== court || sc.segs.length === 1;
    });
    const pool = ['前厅', '正堂', '后院', '内宅'];
    let nodes = [];
    if (sc.segs.length >= 2) {
      for (let i = 1; i < sc.segs.length; i++) nodes.push(sc.segs[i]);
    }
    for (let p = 0; p < pool.length && nodes.length < 3; p++) {
      if (nodes.indexOf(pool[p]) < 0) nodes.push(pool[p]);
    }
    nodes = nodes.slice(0, 3);
    let inner = '';
    const midX = 250,
      topY = 46,
      bw = 150,
      bh = 50,
      vgap = 14;
    inner +=
      '<text x="' +
      midX +
      '" y="36" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" opacity="0.6" letter-spacing="2" font-family="' +
      FFAM +
      '">' +
      esc(court) +
      '</text>';
    // 中轴虚线
    inner +=
      '<line x1="' +
      midX +
      '" y1="' +
      (topY - 4) +
      '" x2="' +
      midX +
      '" y2="262" ' +
      inkS(0.16, 1.5) +
      ' stroke-dasharray="3 6"/>';
    // 主轴院落（从上到下）
    let yy = topY;
    for (let ni = 0; ni < nodes.length; ni++) {
      const nm = nodes[ni],
        kind = matchName(nm, cur) ? 'cur' : matchName(nm, sc.dest) && sc.dest ? 'dest' : '';
      inner += roomCell(midX - bw / 2, yy, bw, bh, nm, kind);
      yy += bh + vgap;
    }
    // 东西厢
    const wy = topY + 24,
      ww2 = 96,
      wh = 58;
    const east = '东厢',
      west = '西厢';
    const ekind = matchName(east, cur) ? 'cur' : matchName(east, sc.dest) && sc.dest ? 'dest' : '';
    const wkind = matchName(west, cur) ? 'cur' : matchName(west, sc.dest) && sc.dest ? 'dest' : '';
    inner += roomCell(28, wy, ww2, wh, west, wkind);
    inner += roomCell(472 - ww2, wy, ww2, wh, east, ekind);
    // 院门
    inner += '<rect x="' + (midX - 26) + '" y="262" width="52" height="0.1"/>';
    inner +=
      '<path d="M' +
      (midX - 22) +
      ' 262 L' +
      (midX - 22) +
      ' 250 M' +
      (midX + 22) +
      ' 262 L' +
      (midX + 22) +
      ' 250 M' +
      (midX - 26) +
      ' 250 L' +
      (midX + 26) +
      ' 250" ' +
      inkS(0.4, 1.4) +
      '/>';
    inner +=
      '<text x="' +
      midX +
      '" y="272" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.5" font-family="' +
      FFAM +
      '">院门</text>';
    // 若当前节点不在已画节点里，补一个高亮标注
    const drawn = nodes.concat([east, west]);
    let hit = false;
    for (let d = 0; d < drawn.length; d++) {
      if (matchName(drawn[d], cur)) {
        hit = true;
        break;
      }
    }
    if (!hit && cur && cur !== court) {
      inner += roomCell(midX - bw / 2, yy, bw, bh, cur, 'cur');
    }
    return frameWrap(inner, court + ' · 平面图');
  }
  function xyBuildInteriorSvg(sc) {
    if (!sc) return '';
    if (sc.kind === 'prison') return buildPrison(sc);
    if (sc.kind === 'manor') return buildManor(sc);
    return buildFloors(sc);
  }

  // ──────────────────────────── 样式（浅紫蓝 · 雅致） ────────────────────────────
  const CSS = `
#xysb-root{width:100%;box-sizing:border-box;font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;font-size:12.5px;line-height:1.55;color:#3a3f63;margin-top:10px;text-align:left;}
#xysb-root *{box-sizing:border-box;margin:0;padding:0;}
#xysb-root .xysb-card{position:relative;background:#f3f4fb;border:1px solid #dfe2f3;border-radius:14px;box-shadow:0 10px 30px rgba(108,111,216,.16),0 2px 6px rgba(108,111,216,.08);overflow:hidden;margin-bottom:9px;}
#xysb-root .xysb-card::before,#xysb-root .xysb-card::after{content:'';position:absolute;width:16px;height:16px;pointer-events:none;opacity:.7;}
#xysb-root .xysb-card::before{top:8px;left:8px;border-top:2px solid #8d90e0;border-left:2px solid #8d90e0;border-top-left-radius:4px;}
#xysb-root .xysb-card::after{bottom:8px;right:8px;border-bottom:2px solid #8d90e0;border-right:2px solid #8d90e0;border-bottom-right-radius:4px;}
#xysb-root .xysb-head{display:flex;align-items:center;gap:8px;padding:12px 16px;background:linear-gradient(135deg,#eef0fc,#e3e7f9);cursor:pointer;user-select:none;border-bottom:1px solid #e4e7f6;}
#xysb-root .xysb-arrow{display:inline-block;transition:transform .2s ease;color:#8d90e0;font-size:11px;flex-shrink:0;}
#xysb-root .open>.xysb-head .xysb-arrow{transform:rotate(90deg);}
#xysb-root .xysb-title{flex:1;text-align:center;font-family:'Kaiti SC','KaiTi','STKaiti','楷体','Noto Serif SC',serif;font-size:17px;font-weight:700;letter-spacing:6px;background:linear-gradient(90deg,#6a5fd8,#4f8de0);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 2px 8px rgba(106,95,216,.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#xysb-root .xysb-badge{flex-shrink:0;font-size:10px;letter-spacing:1px;padding:3px 9px;border-radius:20px;border:1px solid #d4d8ee;color:#8a8fc0;background:#fff;}
#xysb-root .xysb-badge.ok{color:#1f9e7e;border-color:#9fdcc9;background:#effaf5;}
#xysb-root .xysb-badge.warn{color:#c08a1f;border-color:#ecd49a;background:#fdf7ea;}
#xysb-root .xysb-badge.err{color:#d4537a;border-color:#f1bccd;background:#fdf0f4;}
#xysb-root .xysb-body{display:none;padding:13px 14px 12px;}
#xysb-root .xysb-card.open .xysb-body{display:block;}
#xysb-root .xysb-sub{text-align:center;font-family:'Kaiti SC','KaiTi','STKaiti','楷体',serif;font-size:13.5px;color:#6b6fd8;margin:0 0 11px;letter-spacing:2px;}

/* —— 页签 —— */
#xysb-root .xysb-launchbar{display:flex;justify-content:flex-end;gap:7px;padding:9px 14px 0;flex-wrap:wrap;}
#xysb-root .xysb-lbtn{display:inline-flex;align-items:center;gap:6px;cursor:pointer;border-radius:999px;padding:5px 13px;font-size:12px;font-weight:600;line-height:1;letter-spacing:1px;font-family:inherit;transition:all .15s;
 background:color-mix(in srgb,var(--xy-accent,#6a5fd8) 14%,transparent);
 color:var(--xy-accent,#6a5fd8);
 border:1px solid color-mix(in srgb,var(--xy-accent,#6a5fd8) 38%,transparent);}
#xysb-root .xysb-lbtn:hover{background:var(--xy-accent,#6a5fd8);color:#fff;border-color:var(--xy-accent,#6a5fd8);box-shadow:0 3px 10px color-mix(in srgb,var(--xy-accent,#6a5fd8) 30%,transparent);}
#xysb-root .xysb-lbtn i{font-size:12px;}
#xysb-root .xysb-lbtn.off{display:none;}
#xysb-root .xysb-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;background:#e9ebf8;padding:4px;border-radius:11px;}
#xysb-root .xysb-tab{flex:1 1 30%;min-width:88px;padding:7px 4px;background:transparent;border:none;border-radius:8px;color:#7a80b0;font-size:12px;cursor:pointer;font-family:inherit;letter-spacing:2px;transition:all .2s;font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;}
#xysb-root .xysb-tab i{font-size:12px;}
#xysb-root .xysb-tab:hover{color:#4a5080;background:rgba(255,255,255,.7);}
#xysb-root .xysb-tab.active{color:#fff;background:var(--tab-color);box-shadow:0 3px 10px var(--tab-glow);}
#xysb-root .xysb-pane{display:none;}
#xysb-root .xysb-pane.active{display:block;}

/* —— 白卡片 —— */
#xysb-root .xysb-mod{background:#fff;border:1px solid #e6e8f6;border-left:3px solid var(--accent,#7c7ff0);border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 4px 14px rgba(124,127,240,.08);}
#xysb-root .xysb-label{font-size:10.5px;letter-spacing:3px;color:#9aa0cc;margin-bottom:7px;font-weight:600;}
#xysb-root .xysb-big{font-family:'Kaiti SC','KaiTi','STKaiti','楷体','Noto Serif SC',serif;font-size:21px;font-weight:700;letter-spacing:2px;background:linear-gradient(90deg,#6a5fd8,#4f8de0);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.3;}
#xysb-root .xysb-desc{font-size:12px;color:#6f7499;margin-top:5px;line-height:1.6;word-break:break-word;}
#xysb-root .xysb-note{font-size:11px;color:#9aa0cc;text-align:right;margin-top:5px;}

/* —— 进度条 —— */
@keyframes xysbFlow{0%{background-position:0% 0;}100%{background-position:200% 0;}}
#xysb-root .xysb-bhead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;}
#xysb-root .xysb-bname{font-size:12.5px;font-weight:700;color:#4a5080;letter-spacing:1px;}
#xysb-root .xysb-bnum{font-size:13px;font-weight:700;color:#6b6fd8;white-space:nowrap;}
#xysb-root .xysb-bar{height:10px;border-radius:5px;background:#e7eaf7;overflow:hidden;}
#xysb-root .xysb-bar>div{height:100%;width:0%;border-radius:5px;transition:width .4s;background-size:200% 100%;animation:xysbFlow 3.2s linear infinite;}
#xysb-root .xysb-bar>.f-mana{background-image:linear-gradient(90deg,#8b7cf6,#5aa2f7,#8b7cf6);box-shadow:0 0 8px rgba(122,124,243,.45);}
#xysb-root .xysb-bar>.f-hp{background-image:linear-gradient(90deg,#f4798f,#f9a8b8,#f4798f);box-shadow:0 0 8px rgba(244,121,143,.4);}
#xysb-root .xysb-bar>.f-cult{background-image:linear-gradient(90deg,#a78bfa,#60a5fa,#a78bfa);box-shadow:0 0 8px rgba(147,139,250,.45);}
#xysb-root .xysb-bar>.f-corr{background-image:linear-gradient(90deg,#6cc079,#94d3a0,#6cc079);box-shadow:0 0 8px rgba(108,192,121,.4);}
#xysb-root .xysb-bar>.f-corr.cs1{background-image:linear-gradient(90deg,#e0c45a,#ecd98a,#e0c45a);box-shadow:0 0 8px rgba(224,196,90,.42);}
#xysb-root .xysb-bar>.f-corr.cs2{background-image:linear-gradient(90deg,#e89a4a,#f0b87a,#e89a4a);box-shadow:0 0 8px rgba(232,154,74,.45);}
#xysb-root .xysb-bar>.f-corr.cs3{background-image:linear-gradient(90deg,#b06fd0,#c89ae0,#b06fd0);box-shadow:0 0 9px rgba(176,111,208,.5);}
#xysb-root .xysb-bar>.f-corr.cs4{background-image:linear-gradient(90deg,#c0506a,#d87a90,#c0506a);box-shadow:0 0 10px rgba(192,80,106,.55);}
#xysb-root .xysb-bar>.f-lib{background-image:linear-gradient(90deg,#f4a6c0,#ffc0d4,#f4a6c0);box-shadow:0 0 8px rgba(244,166,192,.4);}
#xysb-root .xysb-bar>.f-lib.ls1{background-image:linear-gradient(90deg,#f0a8b8,#f7c3d0,#f0a8b8);box-shadow:0 0 8px rgba(240,168,184,.42);}
#xysb-root .xysb-bar>.f-lib.ls2{background-image:linear-gradient(90deg,#e88aab,#f4a6c0,#e88aab);box-shadow:0 0 8px rgba(232,138,171,.45);}
#xysb-root .xysb-bar>.f-lib.ls3{background-image:linear-gradient(90deg,#d96a96,#e88aab,#d96a96);box-shadow:0 0 9px rgba(217,106,150,.5);}
#xysb-root .xysb-bar>.f-lib.ls4{background-image:linear-gradient(90deg,#c0506a,#d87a90,#c0506a);box-shadow:0 0 10px rgba(192,80,106,.55);}
#xysb-root .xysb-libstage{display:inline-block;padding:1px 9px;border-radius:9px;font-size:12px;font-weight:700;letter-spacing:1px;color:#fff;line-height:1.5;}
#xysb-root .xysb-libstage.ls0{background:#f4a6c0;color:#5a2030;}
#xysb-root .xysb-libstage.ls1{background:#f0a8b8;color:#5a2030;}
#xysb-root .xysb-libstage.ls2{background:#e88aab;}
#xysb-root .xysb-libstage.ls3{background:#d96a96;}
#xysb-root .xysb-libstage.ls4{background:#c0506a;}
#xysb-root .xysb-corrstage{display:inline-block;padding:1px 9px;border-radius:9px;font-size:12px;font-weight:700;letter-spacing:1px;color:#fff;line-height:1.5;}
#xysb-root .xysb-corrstage.cs0{background:#6cc079;}
#xysb-root .xysb-corrstage.cs1{background:#e0c45a;color:#4a3d10;}
#xysb-root .xysb-corrstage.cs2{background:#e89a4a;}
#xysb-root .xysb-corrstage.cs3{background:#b06fd0;}
#xysb-root .xysb-corrstage.cs4{background:#c0506a;}
#xysb-root .xysb-grid2{display:flex;gap:12px;}
#xysb-root .xysb-grid2>div{flex:1;min-width:0;}

/* —— 状态点 —— */
#xysb-root .xysb-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;display:inline-block;}
#xysb-root .xysb-dot.ok{background:#34c98e;box-shadow:0 0 6px rgba(52,201,142,.55);}
#xysb-root .xysb-dot.warn{background:#f0a93b;box-shadow:0 0 6px rgba(240,169,59,.55);}
#xysb-root .xysb-dot.bad{background:#ef5d7a;box-shadow:0 0 6px rgba(239,93,122,.55);}

/* —— 信息行 —— */
#xysb-root .xysb-info{display:flex;flex-direction:column;gap:7px;font-size:13px;line-height:1.65;}
#xysb-root .xysb-info .row{display:flex;gap:10px;}
#xysb-root .xysb-info .row .k{color:#9aa0cc;width:60px;flex-shrink:0;font-weight:700;letter-spacing:1px;}
#xysb-root .xysb-info .row .v{color:#3a3f63;flex:1;min-width:0;word-break:break-word;}
#xysb-root .xysb-info .row .v.em{color:#6b6fd8;}
#xysb-root .xysb-info .row .v.cond{display:flex;align-items:flex-start;gap:7px;}
#xysb-root .xysb-info .row .v.cond .xysb-dot{margin-top:5px;}

/* —— 通用小卡（招式/星器/人物/敌人/物品/委托） —— */
#xysb-root .xysb-item{background:#fff;border:1px solid #e6e8f6;border-left:3px solid var(--accent,#7c7ff0);border-radius:10px;padding:9px 12px;margin-bottom:8px;box-shadow:0 3px 10px rgba(124,127,240,.06);}
#xysb-root .xysb-item:last-child{margin-bottom:0;}
/* —— 列表分区：自适应多列网格（桌面自动多列，手机自动单列） —— */
#xysb-root #xysb-arts,#xysb-root #xysb-treas,#xysb-root #xysb-bag,#xysb-root #xysb-quests{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;align-items:start;}
#xysb-root #xysb-npcs,#xysb-root #xysb-foes{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;align-items:start;}
#xysb-root #xysb-arts>.xysb-item,#xysb-root #xysb-treas>.xysb-item,#xysb-root #xysb-bag>.xysb-item,#xysb-root #xysb-quests>.xysb-item,#xysb-root #xysb-npcs>.xysb-item,#xysb-root #xysb-foes>.xysb-item{margin-bottom:0;}
#xysb-root .xysb-empty{grid-column:1 / -1;}
@media (max-width:520px){
  #xysb-root #xysb-arts,#xysb-root #xysb-treas,#xysb-root #xysb-bag,#xysb-root #xysb-quests{grid-template-columns:repeat(2,1fr);gap:7px;}
  #xysb-root #xysb-npcs,#xysb-root #xysb-foes{grid-template-columns:1fr;}
}
#xysb-root .xysb-itop{display:flex;gap:7px;align-items:baseline;flex-wrap:wrap;margin-bottom:3px;}
#xysb-root .xysb-inm{font-weight:700;font-size:13px;color:#4a5080;}
#xysb-root .xysb-chip{font-size:10px;border-radius:20px;padding:1px 8px;border:1px solid;letter-spacing:.5px;white-space:nowrap;}
#xysb-root .xysb-chip.violet{color:#7c5fd8;border-color:#d4c9f3;background:#f4f0fd;}
#xysb-root .xysb-chip.blue{color:#3f7ed0;border-color:#bcd6f1;background:#eff6fd;}
#xysb-root .xysb-chip.gold{color:#b07f1f;border-color:#ecd49a;background:#fdf8ec;}
#xysb-root .xysb-chip.teal{color:#1f9e7e;border-color:#9fdcc9;background:#effaf5;}
#xysb-root .xysb-chip.rose{color:#d4537a;border-color:#f1bccd;background:#fdf0f4;}
#xysb-root .xysb-irow{font-size:11.5px;color:#5d6285;line-height:1.55;word-break:break-word;}
#xysb-root .xysb-krow{display:flex;gap:8px;font-size:11.5px;line-height:1.6;}
#xysb-root .xysb-krow .nk{color:#9aa0cc;min-width:60px;flex-shrink:0;}
#xysb-root .xysb-krow .nv{color:#3a3f63;flex:1;min-width:0;word-break:break-word;}
#xysb-root .xysb-sec-title{font-family:'Kaiti SC','KaiTi','STKaiti','楷体',serif;font-size:13.5px;font-weight:700;letter-spacing:3px;margin:0 0 8px;color:#6b6fd8;}
#xysb-root .xysb-sec-title.rose{color:#d4537a;}
#xysb-root .xysb-sec-title.teal{color:#1f9e7e;}
#xysb-root .xysb-sec-title.gold{color:#b07f1f;}
#xysb-root .xysb-empty{text-align:center;color:#b3b8da;font-size:11.5px;letter-spacing:2px;padding:14px 0;}
#xysb-root .xysb-warbox{background:#fdf3f6;border:1px dashed #f1bccd;border-radius:8px;padding:8px 11px;margin-bottom:9px;display:flex;gap:9px;font-size:12px;}
#xysb-root .xysb-warbox .wk{color:#d4537a;font-weight:700;flex-shrink:0;}
#xysb-root .xysb-warbox .wv{color:#5d6285;flex:1;min-width:0;word-break:break-word;}
#xysb-root .xysb-mobbar{height:8px;border-radius:4px;background:#f3e0e6;overflow:hidden;margin:4px 0 2px;}
#xysb-root .xysb-mobbar>div{height:100%;width:0%;background:linear-gradient(90deg,#ef5d7a,#f79ab0);transition:width .3s;}
#xysb-root .xysb-mobhp{display:flex;justify-content:space-between;font-size:10.5px;color:#b07a8c;}
#xysb-root .xysb-favor{font-weight:700;}
#xysb-root .xysb-favor.hi{color:#1f9e7e;}
#xysb-root .xysb-favor.lo{color:#d4537a;}
#xysb-root .xysb-favor.mid{color:#8a8fc0;}
#xysb-root .xysb-cnt{color:#b07f1f;font-size:11px;border:1px solid #ecd49a;background:#fdf8ec;border-radius:20px;padding:0 7px;}

/* —— 地图 —— */
#xysb-root .xysb-map svg{width:100%;height:auto;display:block;}
#xysb-root .xysb-maptool{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;flex-wrap:wrap;}
#xysb-root .xysb-maptool .xysb-label{margin:0;}
#xysb-root .xysb-mapwrap{position:relative;}
#xysb-root .xysb-mapviews{display:inline-flex;background:rgba(124,127,240,.08);border:1px solid rgba(124,127,240,.22);border-radius:9px;padding:2px;gap:2px;}
#xysb-root .xysb-mview{font:inherit;font-size:11px;letter-spacing:1px;color:#7b7fb0;background:transparent;border:0;border-radius:7px;padding:3px 11px;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s;}
#xysb-root .xysb-mview.active{background:#fff;color:#5b4fc4;box-shadow:0 1px 3px rgba(91,79,196,.18);font-weight:600;}
#xysb-root .xysb-crumb{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;font-size:12px;color:#4a5080;}
#xysb-root .xysb-crumb .seg{background:#eef0fb;border:1px solid #dfe3f5;border-radius:7px;padding:2px 9px;}
#xysb-root .xysb-crumb .sep{color:#b3b8da;}
#xysb-root .xysb-unk{margin-top:7px;font-size:10.5px;color:#9aa0cc;line-height:1.6;}
@keyframes xysbPing{0%{transform:scale(.6);opacity:.75;}80%{transform:scale(2.2);opacity:0;}100%{opacity:0;}}
#xysb-root .xysb-ping{animation:xysbPing 1.8s ease-out infinite;transform-origin:center;transform-box:fill-box;}
@media (max-width:480px){
  #xysb-root .xysb-tab{min-width:30%;font-size:11px;letter-spacing:1px;}
  #xysb-root .xysb-info .row .k{width:52px;}
  #xysb-root .xysb-title{letter-spacing:3px;font-size:15px;}
  #xysb-root .xysb-realm{font-size:10.5px;letter-spacing:1px;}
}

/* ════════════════════════════════════════════════════════════ */
/*  主题自适应补丁 v6 · 自动“吸取背景图配色”(同色系明/暗) + 磨砂     */
/*  · ◑按钮:自动(吸取背景图)/ ☀亮 / ☾暗。手动亮/暗为中性色。        */
/*  · 透明度=下面 --xy-panel/--xy-panel2 的 %;模糊=.xysb-card blur()  */
/*  · 染色浓淡=JS里 Sp上限0.45/下限0.18;深色面板亮度=pL的24(调大更亮更显色)。 */
/* ════════════════════════════════════════════════════════════ */
#xysb-root{
  --xy-pbase:  var(--SmartThemeBlurTintColor, #eef0fb);
  --xy-pbase2: var(--SmartThemeChatTintColor, #ffffff);
  --xy-text:   var(--SmartThemeBodyColor, #3a3f63);
  --xy-panel:  color-mix(in srgb, var(--xy-pbase)  72%, transparent);
  --xy-panel2: color-mix(in srgb, var(--xy-pbase2) 82%, transparent);
  --xy-t2:   color-mix(in srgb, var(--xy-text) 80%, transparent);
  --xy-t3:   color-mix(in srgb, var(--xy-text) 54%, transparent);
  --xy-t4:   color-mix(in srgb, var(--xy-text) 38%, transparent);
  --xy-track: color-mix(in srgb, var(--xy-text) 16%, transparent);
  --xy-bord:  color-mix(in srgb, var(--xy-text) 16%, transparent);
  --xy-bord2: color-mix(in srgb, var(--xy-text) 10%, transparent);
  --xy-shadow: var(--SmartThemeShadowColor, rgba(20,22,30,.18));
  color: var(--xy-text);
}
/* 自动:用 JS 采样的背景图配色(取不到则退主题色) */
body[data-xysb-theme="auto"][data-xysb-auto] #xysb-root{
  --xy-pbase:  var(--xysb-smp-pbase,  var(--SmartThemeBlurTintColor, #eef0fb));
  --xy-pbase2: var(--xysb-smp-pbase2, var(--SmartThemeChatTintColor, #ffffff));
  --xy-text:   var(--xysb-smp-text,   var(--SmartThemeBodyColor, #3a3f63));
}
/* 手动:亮(中性) */
body[data-xysb-theme="light"] #xysb-root{ --xy-pbase:#eef0fb; --xy-pbase2:#ffffff; --xy-text:#3a3f63; }
/* 手动:暗(中性) */
body[data-xysb-theme="dark"] #xysb-root{ --xy-pbase:#23252f; --xy-pbase2:#2b2d3a; --xy-text:#e6e8f4; }

#xysb-root .xysb-card{ background: var(--xy-panel); border-color: var(--xy-bord); box-shadow: 0 6px 20px var(--xy-shadow); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
#xysb-root .xysb-head{ background: color-mix(in srgb, var(--xy-pbase2) 70%, transparent); border-bottom-color: var(--xy-bord); }
#xysb-root .xysb-mod,
#xysb-root .xysb-item{ background: var(--xy-panel2); border-color: var(--xy-bord2); }
#xysb-root .xysb-tabs{ background: color-mix(in srgb, var(--xy-pbase) 55%, transparent); }
#xysb-root .xysb-tab{ color: var(--xy-t3); }
#xysb-root .xysb-tab:hover{ color: var(--xy-text); background: color-mix(in srgb, var(--xy-text) 10%, transparent); }
#xysb-root .xysb-badge{ background: var(--xy-panel2); border-color: var(--xy-bord); color: var(--xy-t3); }
#xysb-root .xysb-badge.ok,
#xysb-root .xysb-badge.warn,
#xysb-root .xysb-badge.err{ background: color-mix(in srgb, currentColor 15%, transparent); border-color: color-mix(in srgb, currentColor 38%, transparent); }
#xysb-root .xysb-label,
#xysb-root .xysb-note,
#xysb-root .xysb-unk,
#xysb-root .xysb-info .row .k,
#xysb-root .xysb-krow .nk,
#xysb-root .xysb-mobhp{ color: var(--xy-t3); }
#xysb-root .xysb-desc,
#xysb-root .xysb-irow,
#xysb-root .xysb-warbox .wv,
#xysb-root .xysb-info .row .v,
#xysb-root .xysb-krow .nv{ color: var(--xy-t2); }
#xysb-root .xysb-bname,
#xysb-root .xysb-inm,
#xysb-root .xysb-crumb{ color: var(--xy-text); }
#xysb-root .xysb-empty,
#xysb-root .xysb-crumb .sep{ color: var(--xy-t4); }
#xysb-root .xysb-bar,
#xysb-root .xysb-mobbar{ background: var(--xy-track); }
#xysb-root .xysb-crumb .seg{ background: var(--xy-panel2); border-color: var(--xy-bord2); }
#xysb-root .xysb-mapviews{ background: color-mix(in srgb, var(--xy-text) 7%, transparent); border-color: var(--xy-bord); }
#xysb-root .xysb-mview{ color: var(--xy-t3); }
#xysb-root .xysb-mview.active{ background: var(--xy-track); color: var(--xy-text); box-shadow: 0 1px 3px var(--xy-shadow); }
#xysb-root .xysb-mview.xysb-dis{ opacity:.32; cursor:default; box-shadow:none; }
#xysb-root .xysb-crumb .seg.here{ background: color-mix(in srgb, #8b6fe6 20%, transparent); border-color: color-mix(in srgb, #8b6fe6 48%, transparent); font-weight:700; }
#xysb-root .xysb-chip.violet,
#xysb-root .xysb-chip.blue,
#xysb-root .xysb-chip.gold,
#xysb-root .xysb-chip.teal,
#xysb-root .xysb-chip.rose,
#xysb-root .xysb-cnt{ background: color-mix(in srgb, currentColor 14%, transparent); border-color: color-mix(in srgb, currentColor 32%, transparent); }
#xysb-root .xysb-warbox{ background: color-mix(in srgb, #d4537a 10%, transparent); border-color: color-mix(in srgb, #d4537a 38%, transparent); }

#xysb-root .xysb-themebtn{ flex-shrink:0; cursor:pointer; font-size:13px; line-height:1; padding:3px 8px; border-radius:20px; border:1px solid var(--xy-bord); color:var(--xy-t2); background:var(--xy-panel2); user-select:none; transition:color .15s,border-color .15s; }
#xysb-root .xysb-themebtn:hover{ color:var(--xy-text); border-color:var(--xy-text); }
#xysb-root .xysb-themebtn::after{ content:"◑"; }
body[data-xysb-theme="light"] #xysb-root .xysb-themebtn::after{ content:"☀"; }
body[data-xysb-theme="dark"]  #xysb-root .xysb-themebtn::after{ content:"☾"; }

/* ===== 重点色(accent)随主题自适应：标题/境界/页签/边角/段标题/进度，统一吸取背景同色系 ===== */
#xysb-root{ --xy-accent: var(--SmartThemeQuoteColor, #8b6fe6); --xy-accent-soft: color-mix(in srgb, var(--xy-accent) 22%, transparent); }
body[data-xysb-theme="auto"][data-xysb-auto] #xysb-root{ --xy-accent: var(--xysb-smp-accent, var(--SmartThemeQuoteColor, #8b6fe6)); }
body[data-xysb-theme="light"] #xysb-root{ --xy-accent:#6b6fd8; }
body[data-xysb-theme="dark"]  #xysb-root{ --xy-accent:#a98cf0; }
#xysb-root .xysb-card::before, #xysb-root .xysb-card::after{ border-color: var(--xy-accent); }
#xysb-root .xysb-arrow{ color: var(--xy-accent); }
#xysb-root .xysb-title, #xysb-root .xysb-big{ background:none; -webkit-text-fill-color: var(--xy-accent); color: var(--xy-accent); text-shadow:none; }
#xysb-root .xysb-sub, #xysb-root .xysb-bnum, #xysb-root .xysb-info .row .v.em{ color: var(--xy-accent); }
#xysb-root .xysb-sec-title, #xysb-root .xysb-sec-title.rose, #xysb-root .xysb-sec-title.teal, #xysb-root .xysb-sec-title.gold{ color: var(--xy-accent); }
#xysb-root .xysb-mod, #xysb-root .xysb-item{ border-left-color: var(--xy-accent); }
#xysb-root .xysb-tab.active{ background: var(--xy-accent-soft); color: var(--xy-accent); box-shadow: 0 2px 8px color-mix(in srgb, var(--xy-accent) 22%, transparent); }
#xysb-root .xysb-mview.active{ background: var(--xy-accent-soft); color: var(--xy-accent); box-shadow: 0 1px 3px var(--xy-shadow); }
#xysb-root .xysb-bar>.f-cult{ background-image: linear-gradient(90deg, var(--xy-accent), color-mix(in srgb, var(--xy-accent) 55%, #ffffff), var(--xy-accent)); box-shadow: 0 0 8px color-mix(in srgb, var(--xy-accent) 40%, transparent); }

/* ===== 魔人态 · 紫蚀绯红（手动亮/暗时强制重点色；自动态仍随背景图，二者不冲突） ===== */
#xysb-root[data-xysb-role="demon"]{ --xy-accent:#b25cff; }
#xysb-root[data-xysb-role="demon"] .xysb-bar>.f-corr{ background-image:linear-gradient(90deg,#b25cff,#e25a9a,#b25cff); box-shadow:0 0 9px rgba(178,92,255,.5); }
#xysb-root[data-xysb-role="demon"] .xysb-corrstage{ background:#b25cff; }
#xysb-root[data-xysb-role="demon"] .xysb-corrstage.cs0{ background:#9a6ad6; }
#xysb-root[data-xysb-role="demon"] .xysb-libstage{ background:#b25cff; }
#xysb-root[data-xysb-role="demon"] .xysb-libstage.ls0{ background:#9a6ad6; }
`;

  // ──────────────────────────── 骨架 ────────────────────────────
  const MAIN_TABS = [
    { k: 'over', label: '总 览', icon: 'fa-gauge-high', color: '#6c6fd8', glow: 'rgba(108,111,216,.35)' },
    { k: 'char', label: '角 色', icon: 'fa-user', color: '#4f8de0', glow: 'rgba(79,141,224,.35)' },
    { k: 'gong', label: '招 式', icon: 'fa-wand-magic-sparkles', color: '#8d62e0', glow: 'rgba(141,98,224,.35)' },
    { k: 'npc', label: '人 物', icon: 'fa-users', color: '#2fae9b', glow: 'rgba(47,174,155,.35)' },
    { k: 'item', label: '背 包', icon: 'fa-box-open', color: '#d069a8', glow: 'rgba(208,105,168,.35)' },
  ];
  function tabsHtml() {
    return MAIN_TABS.map(function (t) {
      return (
        '<button class="xysb-tab" data-tab="' +
        t.k +
        '" style="--tab-color:' +
        t.color +
        ';--tab-glow:' +
        t.glow +
        '"><i class="fa-solid ' +
        t.icon +
        '"></i>' +
        t.label +
        '</button>'
      );
    }).join('');
  }

  const SKELETON = `
<div class="xysb-card" id="xysb-main">
  <div class="xysb-launchbar" id="xysb-launchbar">
    <button class="xysb-lbtn" id="xysb-open-npc" type="button"><i class="fa-solid fa-users"></i><span>人物</span></button>
    <button class="xysb-lbtn" id="xysb-open-mon" type="button"><i class="fa-solid fa-gem"></i><span>监控</span></button>
  </div>
  <div class="xysb-head" id="xysb-toggle">
    <span class="xysb-arrow">▶</span>
    <span class="xysb-title" id="xysb-title">魔 法 少 女 状 态 栏</span>
    <span class="xysb-themebtn" id="xysb-themebtn" title="主题:自动(吸取背景图配色)/亮/暗 — 点击切换"></span><span class="xysb-badge" id="xysb-badge">⌛ 等待 MVU</span>
  </div>
  <div class="xysb-body">
    <div class="xysb-tabs">${tabsHtml()}</div>

    <div class="xysb-pane" data-pane="over">
      <div class="xysb-mod" style="--accent:#7c7ff0">
        <div class="xysb-label">等 级 阶 级</div>
        <div class="xysb-big" id="xysb-realm">— · —</div>
        <div class="xysb-desc" id="xysb-realmdesc">—</div>
        <div style="margin-top:10px">
          <div class="xysb-bhead"><span class="xysb-bname">经验进度</span><span class="xysb-bnum"><span id="xysb-cult">0</span> / <span id="xysb-cultmax">100</span></span></div>
          <div class="xysb-bar"><div class="f-cult" id="xysb-cultbar"></div></div>
          <div class="xysb-note" id="xysb-bottleneck">—</div>
        </div>
      </div>
      <div class="xysb-mod" style="--accent:#5aa2f7">
        <div class="xysb-label">生 命 · 魔 力</div>
        <div class="xysb-grid2">
          <div>
            <div class="xysb-bhead"><span class="xysb-bname">生命</span><span class="xysb-bnum"><span id="xysb-hp">0</span> / <span id="xysb-hpmax">100</span></span></div>
            <div class="xysb-bar"><div class="f-hp" id="xysb-hpbar"></div></div>
          </div>
          <div>
            <div class="xysb-bhead"><span class="xysb-bname">魔力</span><span class="xysb-bnum"><span id="xysb-mp">0</span> / <span id="xysb-mpmax">100</span></span></div>
            <div class="xysb-bar"><div class="f-mana" id="xysb-mpbar"></div></div>
          </div>
        </div>
      </div>
      <div class="xysb-mod" id="xysb-corrmod" style="--accent:#b06fd0">
        <div class="xysb-label" id="xysb-corrlabel">恶 堕 · 侵 蚀</div>
        <div class="xysb-bhead"><span class="xysb-bname"><span class="xysb-corrstage cs0" id="xysb-corrstage">未染</span></span><span class="xysb-bnum"><span id="xysb-corr">0</span> / 100</span></div>
        <div class="xysb-bar"><div class="f-corr cs0" id="xysb-corrbar"></div></div>
        <div class="xysb-note" id="xysb-corrnote">尚未沾染深渊气息</div>
      </div>
      <div class="xysb-mod" id="xysb-libmod" style="--accent:#e88aab">
        <div class="xysb-label" id="xysb-liblabel">自 我 解 放 · 淫 堕</div>
        <div class="xysb-bhead"><span class="xysb-bname"><span class="xysb-libstage ls0" id="xysb-libstage">未启</span></span><span class="xysb-bnum"><span id="xysb-lib">0</span> / 100</span></div>
        <div class="xysb-bar"><div class="f-lib ls0" id="xysb-libbar"></div></div>
        <div class="xysb-note" id="xysb-libnote">尚未开启自我解放</div>
      </div>
      <div class="xysb-mod" style="--accent:#9aa0cc">
        <div class="xysb-label">行 踪 · 境 况</div>
        <div class="xysb-info">
          <div class="row"><span class="k">地点:</span><span class="v" id="xysb-loc">—</span></div>
          <div class="row"><span class="k">时间:</span><span class="v" id="xysb-time">—</span></div>
          <div class="row"><span class="k" id="xysb-lbl-attire">战服:</span><span class="v" id="xysb-attire">—</span></div>
          <div class="row"><span class="k">状态:</span><span class="v cond"><span class="xysb-dot ok" id="xysb-dot"></span><span id="xysb-cond">—</span></span></div>
        </div>
      </div>
    </div>

    <div class="xysb-pane" data-pane="char">
      <div class="xysb-mod" style="--accent:#4f8de0">
        <div class="xysb-label">契 约 档 案</div>
        <div class="xysb-info">
          <div class="row"><span class="k">代号:</span><span class="v" id="xysb-name">—</span></div>
          <div class="row"><span class="k">性别:</span><span class="v" id="xysb-gender">—</span></div>
          <div class="row"><span class="k" id="xysb-lbl-form">变身:</span><span class="v em" id="xysb-form">—</span></div>
          <div class="row"><span class="k">年龄:</span><span class="v" id="xysb-age">—</span></div>
          <div class="row"><span class="k">阵营:</span><span class="v" id="xysb-ident">—</span></div>
          <div class="row"><span class="k" id="xysb-lbl-sys">系别:</span><span class="v em" id="xysb-root2">—</span></div>
          <div class="row"><span class="k">亲和:</span><span class="v em" id="xysb-phys">—</span></div>
          <div class="row"><span class="k">外貌:</span><span class="v" id="xysb-look">—</span></div>
        </div>
      </div>
      <div class="xysb-mod" style="--accent:#8d62e0">
        <div class="xysb-label">躯 体 白 描</div>
        <div id="xysb-bodyrows"><div class="xysb-empty">暂 无 记 录</div></div>
      </div>
    </div>

    <div class="xysb-pane" data-pane="gong">
      <div class="xysb-sec-title" id="xysb-lbl-arts">✨ 招 式 · 技 能</div>
      <div id="xysb-arts" style="--accent:#8d62e0"><div class="xysb-empty">尚 未 习 得 招 式</div></div>
    </div>

    <div class="xysb-pane" data-pane="npc">
      <div class="xysb-sec-title teal">✦ 重 要 人 物</div>
      <div id="xysb-npcs" style="--accent:#2fae9b"><div class="xysb-empty">暂 无 人 物 档 案</div></div>
      <div class="xysb-sec-title rose" style="margin-top:12px">⚔ 在 场 敌 情</div>
      <div class="xysb-warbox"><span class="wk">⚔ 战况</span><span class="wv" id="xysb-war2">—</span></div>
      <div id="xysb-foes" style="--accent:#e26d8c"><div class="xysb-empty">当 前 无 在 场 敌 人</div></div>
    </div>

    <div class="xysb-pane" data-pane="item">
      <div class="xysb-sec-title gold">⚜ 星 器 · 装 备</div>
      <div id="xysb-treas" style="--accent:#d99a3a"><div class="xysb-empty">尚 无 星 器</div></div>
      <div class="xysb-sec-title teal" style="margin-top:12px">🎒 背 包</div>
      <div id="xysb-bag" style="--accent:#d99a3a"><div class="xysb-empty">背 包 空 空</div></div>
      <div class="xysb-sec-title" style="margin-top:12px">📜 委 托 · 因 果</div>
      <div id="xysb-quests" style="--accent:#4f8de0"><div class="xysb-empty">暂 无 挂 牵</div></div>
    </div>
  </div>
</div>

`;

  // ──────────────────────────── 构建 DOM ────────────────────────────
  const styleEl = D.createElement('style');
  styleEl.id = 'xysb-style';
  styleEl.textContent = CSS;
  const oldStyle = D.getElementById('xysb-style');
  if (oldStyle) oldStyle.remove();
  D.head.appendChild(styleEl);
  // ── 主题:自动(吸取背景图配色,同色系明/暗)/亮/暗 ──
  try {
    const _cache = W.__XYSB_CACHE__ || (W.__XYSB_CACHE__ = {});
    function _parseRGB(s) {
      if (!s) return null;
      s = String(s).trim();
      let r,
        g,
        b,
        m = s.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map(parseFloat);
        r = p[0];
        g = p[1];
        b = p[2];
      } else if (s.charAt(0) === '#') {
        let h = s.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        r = parseInt(h.slice(0, 2), 16);
        g = parseInt(h.slice(2, 4), 16);
        b = parseInt(h.slice(4, 6), 16);
      } else return null;
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r: r, g: g, b: b };
    }
    function _rgb2hsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      let mx = Math.max(r, g, b),
        mn = Math.min(r, g, b),
        h,
        s,
        l = (mx + mn) / 2;
      if (mx === mn) {
        h = 0;
        s = 0;
      } else {
        const dd = mx - mn;
        s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
        if (mx === r) h = (g - b) / dd + (g < b ? 6 : 0);
        else if (mx === g) h = (b - r) / dd + 2;
        else h = (r - g) / dd + 4;
        h /= 6;
      }
      return [h * 360, s, l];
    }
    function _applyRGB(c) {
      const hsl = _rgb2hsl(c.r, c.g, c.b),
        H = Math.round(hsl[0]),
        oS = hsl[1];
      const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255,
        dark = lum < 0.45;
      const Sp = Math.min(Math.max(oS, 0.18), 0.45),
        St = Math.min(oS, 0.2);
      const pL = dark ? 34 : 93,
        p2L = dark ? 42 : 97,
        tL = dark ? 92 : 24;
      function HS(s, l) {
        return 'hsl(' + H + ',' + Math.round(s * 100) + '%,' + l + '%)';
      }
      try {
        D.body.style.setProperty('--xysb-smp-pbase', HS(Sp, pL));
        D.body.style.setProperty('--xysb-smp-pbase2', HS(Sp, p2L));
        D.body.style.setProperty('--xysb-smp-text', HS(St, tL));
        const aS = Math.min(Math.max(oS, 0.42), 0.7),
          aL = dark ? 66 : 46;
        if (oS >= 0.08)
          D.body.style.setProperty('--xysb-smp-accent', 'hsl(' + H + ',' + Math.round(aS * 100) + '%,' + aL + '%)');
        else D.body.style.removeProperty('--xysb-smp-accent');
        D.body.setAttribute('data-xysb-auto', dark ? 'dark' : 'light');
      } catch (e) {}
    }
    function _fallback() {
      try {
        const cs = W.getComputedStyle(D.documentElement);
        const c =
          _parseRGB(cs.getPropertyValue('--SmartThemeBlurTintColor')) ||
          _parseRGB(cs.getPropertyValue('--SmartThemeChatTintColor'));
        if (c) {
          _applyRGB(c);
          return;
        }
      } catch (e) {}
      try {
        D.body.style.removeProperty('--xysb-smp-pbase');
        D.body.style.removeProperty('--xysb-smp-pbase2');
        D.body.style.removeProperty('--xysb-smp-text');
        D.body.style.removeProperty('--xysb-smp-accent');
      } catch (e) {}
      try {
        D.body.setAttribute('data-xysb-auto', 'light');
      } catch (e) {}
    }
    function _detect() {
      if ((D.body.getAttribute('data-xysb-theme') || 'auto') !== 'auto') return;
      let el = D.querySelector('#bg1') || D.querySelector('#bg_custom') || D.body,
        bi = '';
      try {
        bi = W.getComputedStyle(el).backgroundImage || '';
      } catch (e) {}
      const um = bi.match(/url\(["']?([^"')]+)["']?\)/);
      if (!um) {
        _fallback();
        return;
      }
      const url = um[1];
      if (_cache[url]) {
        _applyRGB(_cache[url]);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          const cv = D.createElement('canvas');
          cv.width = 32;
          cv.height = 32;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, 32, 32);
          let dt = ctx.getImageData(0, 0, 32, 32).data,
            sr = 0,
            sg = 0,
            sb = 0,
            n = 0;
          for (let i = 0; i < dt.length; i += 4) {
            sr += dt[i];
            sg += dt[i + 1];
            sb += dt[i + 2];
            n++;
          }
          const c = { r: sr / n, g: sg / n, b: sb / n };
          _cache[url] = c;
          _applyRGB(c);
        } catch (e) {
          _fallback();
        }
      };
      img.onerror = function () {
        _fallback();
      };
      img.src = url;
    }
    W.__XYSB_DETECT__ = _detect;
    let _m = 'auto';
    try {
      _m = W.localStorage.getItem('xysb-theme-mode') || 'auto';
    } catch (e) {}
    try {
      D.body.setAttribute('data-xysb-theme', _m);
    } catch (e) {}
    _detect();
    setTimeout(_detect, 400);
    setTimeout(_detect, 1500);

    try {
      if (W.__XYSB_BGOBS__) W.__XYSB_BGOBS__.disconnect();
      const _bg = D.querySelector('#bg1') || D.querySelector('#bg_custom');
      if (_bg && W.MutationObserver) {
        W.__XYSB_BGOBS__ = new W.MutationObserver(function () {
          _detect();
        });
        W.__XYSB_BGOBS__.observe(_bg, { attributes: true, attributeFilter: ['style', 'src'] });
      }
    } catch (e) {}
  } catch (e) {}

  const oldRoot = D.getElementById('xysb-root');
  if (oldRoot) oldRoot.remove();
  const wrapper = D.createElement('div');
  wrapper.id = 'xysb-root';
  wrapper.innerHTML = SKELETON;

  function $id(id) {
    return wrapper.querySelector('#' + id);
  }
  function setT(id, val) {
    const el = $id(id);
    if (el) el.textContent = val;
  }
  function setW(id, p) {
    const el = $id(id);
    if (el) el.style.width = p + '%';
  }

  // ──────────────────────────── 折叠 / 页签 ────────────────────────────
  const mainCard = $id('xysb-main');
  if (lsGet('xysb_open', '1') === '1') mainCard.classList.add('open');
  $id('xysb-toggle').addEventListener('click', function () {
    lsSet('xysb_open', mainCard.classList.toggle('open') ? '1' : '0');
  });
  const _tbtn = $id('xysb-themebtn');
  if (_tbtn)
    _tbtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (ev.preventDefault) ev.preventDefault();
      const order = ['auto', 'light', 'dark'],
        cur = D.body.getAttribute('data-xysb-theme') || 'auto';
      const nxt = order[(order.indexOf(cur) + 1) % order.length];
      D.body.setAttribute('data-xysb-theme', nxt);
      try {
        W.localStorage.setItem('xysb-theme-mode', nxt);
      } catch (e) {}
      try {
        if (W.__XYSB_DETECT__) W.__XYSB_DETECT__();
      } catch (e) {}
    });

  function bindTabs(tabSel, paneSel, lsKey, defKey) {
    const saved = lsGet(lsKey, defKey);
    const tabs = wrapper.querySelectorAll(tabSel);
    const panes = wrapper.querySelectorAll(paneSel);
    function activate(k) {
      tabs.forEach(function (t) {
        t.classList.toggle('active', t.dataset.tab === k);
      });
      panes.forEach(function (p) {
        p.classList.toggle('active', p.dataset.pane === k);
      });
    }
    activate(saved);
    let anyActive = false;
    tabs.forEach(function (t) {
      if (t.classList.contains('active')) anyActive = true;
    });
    if (!anyActive) activate(defKey);
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        activate(t.dataset.tab);
        lsSet(lsKey, t.dataset.tab);
      });
    });
  }
  bindTabs('.xysb-tab', '.xysb-pane', 'xysb_tab', 'over');

  // —— 顶部启动按钮：切换「人物档案」/「变量监控器」面板（按钮归状态栏所有 → 不与悬浮层抢位、不闪烁；状态栏随聊天消失，面板也随之关闭）——
  function _lbtnClick(fnName) {
    return function (e) {
      try {
        e.stopPropagation();
      } catch (er) {}
      try {
        if (typeof W[fnName] === 'function') W[fnName]();
      } catch (er) {}
    };
  }
  const _bNpc = $id('xysb-open-npc');
  if (_bNpc) _bNpc.addEventListener('click', _lbtnClick('__MVU_NPC_TOGGLE__'));
  const _bMon = $id('xysb-open-mon');
  if (_bMon) _bMon.addEventListener('click', _lbtnClick('__MVU_MON_TOGGLE__'));
  function updateLaunchbar() {
    const lb = $id('xysb-launchbar');
    if (!lb) return;
    let hasN = false,
      hasM = false;
    try {
      hasN = typeof W.__MVU_NPC_TOGGLE__ === 'function';
    } catch (e) {}
    try {
      hasM = typeof W.__MVU_MON_TOGGLE__ === 'function';
    } catch (e) {}
    const bn = $id('xysb-open-npc'),
      bm = $id('xysb-open-mon');
    if (bn) bn.classList.toggle('off', !hasN);
    if (bm) bm.classList.toggle('off', !hasM);
    lb.style.display = hasN || hasM ? '' : 'none';
  }
  updateLaunchbar();

  // ──────────────────────────── 数据渲染 ────────────────────────────
  function setBadge(cls, text) {
    const b = $id('xysb-badge');
    if (!b) return;
    b.className = 'xysb-badge ' + cls;
    b.textContent = text;
  }
  function chip(cls, text) {
    if (!text || text === '—') return '';
    return '<span class="xysb-chip ' + cls + '">' + esc(text) + '</span>';
  }

  function render() {
    let tables = readTables();
    const M = getMvu();
    if (tables && Object.keys(tables).length) setBadge('ok', '✓ MVU 已同步');
    else if (M) setBadge('warn', '⌛ 等待变量初始化');
    else setBadge('err', '✕ 未检测到 MVU');
    tables = tables || {};

    const prof = findTable(tables, '主角档案');
    const stat = findTable(tables, '主角状态');
    const cult = findTable(tables, '等级');
    const glob = findTable(tables, '全局');
    const bodyT = findTable(tables, '躯体');
    const arts = findTable(tables, '招式');
    const treas = findTable(tables, '星器');
    const npc = findTable(tables, '重要人物');
    const foes = findTable(tables, '在场敌人') || findTable(tables, '敌人');
    const bag = findTable(tables, '行囊') || findTable(tables, '储物');
    const quest = findTable(tables, '委托');

    const pr = firstRow(prof),
      st = firstRow(stat),
      cu = firstRow(cult),
      gl = firstRow(glob);

    // —— 身份判定：魔人/魔物 vs 魔法少女（决定阶梯·称谓·配色）——
    const _identRaw = cellOf(prof, pr, '身份阵营', cellOf(prof, pr, '阵营', cellOf(prof, pr, '身份', '')));
    const _sysRaw = cellOf(prof, pr, '系别', '');
    const _rankRaw = cellOf(cult, cu, '阶级', '');
    const _roleStr = _identRaw + ' ' + _sysRaw + ' ' + _rankRaw;
    const isFallen = /恶堕/.test(_roleStr) && /魔法少女|守护者|魔法/.test(_roleStr);
    const roleDemon = /魔人|魔物|深渊|同盟|位格|孳生体|蚀魂者|化渊者|噬星者|渊厄/.test(_roleStr) || isFallen;
    const rootEl = D.getElementById('xysb-root');
    if (rootEl) rootEl.setAttribute('data-xysb-role', roleDemon ? 'demon' : 'mahou');
    // 「恶堕·侵蚀」是魔法少女专属堕落轨；魔人/魔物视角不存在此机制 → 整栏隐藏
    const _corrMod = D.getElementById('xysb-corrmod');
    if (_corrMod) _corrMod.style.display = roleDemon ? 'none' : '';
    // 「自我解放·淫堕」同样是魔法少女专属；魔人/魔物视角隐藏
    const _libMod = D.getElementById('xysb-libmod');
    if (_libMod) _libMod.style.display = roleDemon ? 'none' : '';
    // 标签随身份改写（仅显示层，数据本身不动）
    if (roleDemon) {
      setT('xysb-corrlabel', '魔 性 · 侵 蚀');
      setT('xysb-lbl-form', '现形:');
      setT('xysb-lbl-sys', '本能:');
      setT('xysb-lbl-attire', '形态:');
      setT('xysb-lbl-arts', '⛧ 魔 技 · 异 能');
    } else {
      setT('xysb-corrlabel', '恶 堕 · 侵 蚀');
      setT('xysb-lbl-form', '变身:');
      setT('xysb-lbl-sys', '系别:');
      setT('xysb-lbl-attire', '战服:');
      setT('xysb-lbl-arts', '✨ 招 式 · 技 能');
    }

    // —— 标题 ——
    const name = cellOf(prof, pr, '代号', cellOf(prof, pr, '姓名', '—'));
    setT(
      'xysb-title',
      name !== '—'
        ? name + (roleDemon ? ' 的 魔 契 面 板' : ' 的 状 态 栏')
        : roleDemon
          ? '魔 契 面 板'
          : '魔 法 少 女 状 态 栏',
    );

    // —— 等级阶级 ——（把身份传进去：魔人空/含糊阶级时映射深渊位格而非战姬）
    const R = levelInfo(_rankRaw, cellOf(cult, cu, '等级', ''), roleDemon);
    setT('xysb-realm', R.label);
    const ident = cellOf(prof, pr, '阵营', cellOf(prof, pr, '身份', '—'));
    const root = cellOf(prof, pr, '系别', '—');
    const phys = cellOf(prof, pr, '亲和', '—');
    const descParts = [];
    if (ident !== '—') descParts.push(ident);
    const talent =
      (root !== '—' ? root : '') +
      (phys !== '—' && phys !== '无' && phys !== '无特殊' ? (root !== '—' ? '＋' : '') + phys : '');
    if (talent) descParts.push(talent);
    setT('xysb-realmdesc', descParts.length ? descParts.join('，') : '—');
    const expP = pair(cellOf(cult, cu, '当前经验', '0'), Math.max(1, num(cellOf(cult, cu, '升级所需', '100'), 100)));
    const expMax = num(cellOf(cult, cu, '升级所需', String(expP[1])), expP[1]);
    if (expMax > 0) expP[1] = expMax;
    const prog = pct(expP[0], expP[1]);
    setT('xysb-cult', expP[0]);
    setT('xysb-cultmax', expP[1]);
    setW('xysb-cultbar', prog);
    const bott = cellOf(cult, cu, '瓶颈', cellOf(cult, cu, '越阶', '—'));
    setT(
      'xysb-bottleneck',
      bott !== '—'
        ? '瓶颈：' + bott
        : R.name
          ? R.name + '阶 · 距下一级约 ' + Math.max(0, expP[1] - expP[0]) + ' 经验'
          : '—',
    );

    // —— 当前状态 ——
    const hpP = pair(cellOf(stat, st, '生命', '0'), 100);
    const mpP = pair(cellOf(stat, st, '魔力', '0'), 100);
    const cond = cellOf(stat, st, '处境', '—');
    const tone = condTone(cond, pct(hpP[0], hpP[1]));
    const dot = $id('xysb-dot');
    if (dot) dot.className = 'xysb-dot ' + tone;
    setT('xysb-cond', cond);

    // —— 生命魔力 ——
    setT('xysb-hp', hpP[0]);
    setT('xysb-hpmax', hpP[1]);
    setW('xysb-hpbar', pct(hpP[0], hpP[1]));
    setT('xysb-mp', mpP[0]);
    setT('xysb-mpmax', mpP[1]);
    setW('xysb-mpbar', pct(mpP[0], mpP[1]));

    // —— 恶堕侵蚀（魔人显示「魔性」语义，数据按同一序号映射，不改库）——
    const corrStageRaw = cellOf(stat, st, '恶堕阶段', cellOf(stat, st, '恶堕', '未染'));
    const corrVal = Math.max(0, Math.min(100, num(cellOf(stat, st, '侵蚀值', cellOf(stat, st, '侵蚀', '0')), 0)));
    const CORR_STAGES = ['未染', '初蚀', '沉沦', '半堕', '恶堕'];
    const DEMON_STAGES = ['蛰伏', '躁动', '嗜杀', '狂噬', '魔威'];
    let corrIdx = 0;
    for (let cs2 = 0; cs2 < CORR_STAGES.length; cs2++) {
      if (String(corrStageRaw).indexOf(CORR_STAGES[cs2]) !== -1) {
        corrIdx = cs2;
        break;
      }
    }
    const STG = roleDemon ? DEMON_STAGES : CORR_STAGES;
    const corrBadge = $id('xysb-corrstage');
    if (corrBadge) {
      corrBadge.textContent = STG[corrIdx];
      corrBadge.className = 'xysb-corrstage cs' + corrIdx;
    }
    setT('xysb-corr', corrVal);
    setW('xysb-corrbar', corrVal);
    const corrBar = $id('xysb-corrbar');
    if (corrBar) corrBar.className = 'f-corr cs' + corrIdx;
    const CORR_NOTE = [
      '尚未沾染深渊气息',
      '已现侵蚀征兆，需加警惕',
      '心神渐被侵染，宜尽早净化',
      '濒临失控边缘，亟需净化',
      '已然恶堕 · 世界级威胁',
    ];
    const DEMON_NOTE = [
      '魔性内敛 · 理智在握',
      '嗜血渐起 · 杀意微露',
      '魔性上涌 · 渐难自抑',
      '濒临狂化 · 理智将崩',
      '魔威尽显 · 灾劫降世',
    ];
    setT('xysb-corrnote', (roleDemon ? DEMON_NOTE : CORR_NOTE)[corrIdx]);

    // —— 自我解放·淫堕（魔法少女专属；与恶堕互斥，由自身意志推进）——
    const libStageRaw = cellOf(stat, st, '解放阶段', cellOf(stat, st, '解放', '未启'));
    const libVal = Math.max(0, Math.min(100, num(cellOf(stat, st, '解放度', '0'), 0)));
    const LIB_STAGES = ['未启', '羞启', '坦然', '盛放', '极意'];
    let libIdx = 0;
    for (let ls2 = 0; ls2 < LIB_STAGES.length; ls2++) {
      if (String(libStageRaw).indexOf(LIB_STAGES[ls2]) !== -1) {
        libIdx = ls2;
        break;
      }
    }
    const libBadge = $id('xysb-libstage');
    if (libBadge) {
      libBadge.textContent = LIB_STAGES[libIdx];
      libBadge.className = 'xysb-libstage ls' + libIdx;
    }
    setT('xysb-lib', libVal);
    setW('xysb-libbar', libVal);
    const libBar = $id('xysb-libbar');
    if (libBar) libBar.className = 'f-lib ls' + libIdx;
    const LIB_NOTE = [
      '尚未开启自我解放',
      '开始正视自身欲望，仍带羞涩',
      '坦然接纳天性，气场渐变',
      '欲望与战斗并行不悖，盛放自如',
      '极意·完全统一的自我，定义自己的自由',
    ];
    setT('xysb-libnote', LIB_NOTE[libIdx]);

    // —— 行踪境况 ——
    setT('xysb-loc', cellOf(glob, gl, '地点', '—'));
    setT('xysb-time', cellOf(glob, gl, '当前时间', cellOf(glob, gl, '时间', '—')));
    const form = cellOf(stat, st, '形态', cellOf(prof, pr, '形态', cellOf(prof, pr, '当前形态', '—')));
    let _attire = cellOf(stat, st, '战服', '—');
    if ((_attire === '—' || _attire === '') && /原形|本体|兽形|兽身|现出原形|现形/.test(form)) _attire = '原形·无衣冠';
    setT('xysb-attire', _attire);
    const war = cellOf(stat, st, '战况', '—');
    setT('xysb-war2', war);

    // —— 角色档案 ——
    setT('xysb-name', name);
    setT('xysb-gender', cellOf(prof, pr, '性别', '—'));
    setT('xysb-age', cellOf(prof, pr, '年龄', '—'));
    setT('xysb-ident', ident);
    setT('xysb-root2', root);
    setT('xysb-phys', phys);
    setT('xysb-look', cellOf(prof, pr, '外貌', '—'));

    setT('xysb-form', form);
    const bodyBox = $id('xysb-bodyrows');
    if (bodyT && bodyT.rows.length) {
      let bHtml = '';
      if (form && form !== '—')
        bHtml +=
          '<div class="xysb-krow" style="margin-bottom:8px"><span class="nk">当前形态</span><span class="nv">' +
          chip('violet', form) +
          '</span></div>';
      bodyT.rows.forEach(function (r) {
        const part = cellOf(bodyT, r, '部位', '—');
        if (part === '—') return;
        const btag = chip('blue', cellOf(bodyT, r, '形态', ''));
        bHtml +=
          '<div class="xysb-krow" style="margin-bottom:6px"><span class="nk">' +
          esc(part) +
          btag +
          '</span><span class="nv">' +
          esc(cellOf(bodyT, r, '白描', '—')) +
          '</span></div>';
      });
      bodyBox.innerHTML = bHtml || '<div class="xysb-empty">暂 无 记 录</div>';
    } else bodyBox.innerHTML = '<div class="xysb-empty">暂 无 记 录</div>';

    // —— 功法 ——
    const artBox = $id('xysb-arts');
    if (arts && arts.rows.length) {
      let aHtml = '';
      arts.rows.forEach(function (r) {
        const an = cellOf(arts, r, '名称', '—');
        if (an === '—') return;
        aHtml +=
          '<div class="xysb-item"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(an) +
          '</span>' +
          chip('violet', cellOf(arts, r, '品阶', '')) +
          chip('blue', cellOf(arts, r, '类型', '')) +
          chip('teal', cellOf(arts, r, '熟练度', '')) +
          '</div><div class="xysb-irow">' +
          esc(cellOf(arts, r, '效果', '—')) +
          '</div></div>';
      });
      artBox.innerHTML = aHtml || '<div class="xysb-empty">尚 未 习 得 功 法</div>';
    } else artBox.innerHTML = '<div class="xysb-empty">尚 未 习 得 功 法</div>';

    // —— 星器 ——
    const treaBox = $id('xysb-treas');
    if (treas && treas.rows.length) {
      let tHtml = '';
      treas.rows.forEach(function (r) {
        const tn = cellOf(treas, r, '名称', '—');
        if (tn === '—') return;
        tHtml +=
          '<div class="xysb-item"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(tn) +
          '</span>' +
          chip('gold', cellOf(treas, r, '品阶', '')) +
          chip('blue', cellOf(treas, r, '类型', '')) +
          chip('violet', cellOf(treas, r, '契合', '')) +
          '</div><div class="xysb-irow">' +
          esc(cellOf(treas, r, '效果', '—')) +
          '</div></div>';
      });
      treaBox.innerHTML = tHtml || '<div class="xysb-empty">身 无 长 物</div>';
    } else treaBox.innerHTML = '<div class="xysb-empty">身 无 长 物</div>';

    // —— 人物 ——（升级：性别年龄·生命魔力·躯体拆分·招式，与主面板细节看齐）
    const npcBox = $id('xysb-npcs');
    function splitBody(s) {
      s = String(s || '').trim();
      if (!s || s === '—') return [];
      return s
        .split(/[；;\n]+/)
        .map(function (seg) {
          seg = seg.trim();
          if (!seg) return null;
          const ci = seg.search(/[:：]/);
          if (ci > -1) return { part: seg.slice(0, ci).trim(), desc: seg.slice(ci + 1).trim() };
          return { part: '', desc: seg };
        })
        .filter(Boolean);
    }
    if (npc && npc.rows.length) {
      let nHtml = '';
      npc.rows.forEach(function (r) {
        const nn = cellOf(npc, r, '姓名', '—');
        if (nn === '—') return;
        const favor = num(cellOf(npc, r, '好感', ''), null);
        const fcls = favor == null ? 'mid' : favor >= 30 ? 'hi' : favor <= -30 ? 'lo' : 'mid';
        const sexAge = cellOf(npc, r, '性别', '');
        const nHp = cellOf(npc, r, '生命', ''),
          nHpM = cellOf(npc, r, '生命上限', '');
        const nMp = cellOf(npc, r, '魔力', ''),
          nMpM = cellOf(npc, r, '魔力上限', '');
        const nArts = cellOf(npc, r, '招式', cellOf(npc, r, '技能', cellOf(npc, r, '手段', '')));
        const bodyArr = splitBody(cellOf(npc, r, '躯体', ''));
        nHtml +=
          '<div class="xysb-item"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(nn) +
          '</span>' +
          chip('teal', cellOf(npc, r, '身份', '')) +
          chip('violet', cellOf(npc, r, '等级', '')) +
          chip('blue', sexAge) +
          (cellOf(npc, r, '恶堕', '') ? chip('rose', '堕·' + cellOf(npc, r, '恶堕', '')) : '') +
          (cellOf(npc, r, '解放', '') && cellOf(npc, r, '解放', '') !== '未启'
            ? chip('rose', '放·' + cellOf(npc, r, '解放', ''))
            : '') +
          (favor == null
            ? ''
            : '<span class="xysb-chip ' +
              (fcls === 'hi' ? 'teal' : fcls === 'lo' ? 'rose' : 'blue') +
              '">好感 ' +
              favor +
              '</span>') +
          '</div>';
        if (nHp !== '' || nMp !== '') {
          nHtml +=
            '<div class="xysb-krow"><span class="nk">生命/魔力</span><span class="nv">' +
            esc(nHp || '—') +
            (nHpM ? ' / ' + esc(nHpM) : '') +
            '　·　' +
            esc(nMp || '—') +
            (nMpM ? ' / ' + esc(nMpM) : '') +
            '</span></div>';
        }
        nHtml +=
          '<div class="xysb-krow"><span class="nk">关系</span><span class="nv">' +
          esc(cellOf(npc, r, '关系', '—')) +
          '</span></div>' +
          '<div class="xysb-krow"><span class="nk">状态</span><span class="nv">' +
          esc(cellOf(npc, r, '当前状态', '—')) +
          '</span></div>';
        if (nArts)
          nHtml +=
            '<div class="xysb-krow"><span class="nk">招式</span><span class="nv">' + esc(nArts) + '</span></div>';
        if (bodyArr.length) {
          nHtml +=
            '<div class="xysb-krow" style="margin-top:2px"><span class="nk">躯体</span><span class="nv"></span></div>';
          bodyArr.forEach(function (b) {
            nHtml +=
              '<div class="xysb-krow" style="margin-left:10px"><span class="nk">' +
              (b.part ? esc(b.part) : '·') +
              '</span><span class="nv">' +
              esc(b.desc) +
              '</span></div>';
          });
        }
        nHtml +=
          '<div class="xysb-krow"><span class="nk">钩子/秘密</span><span class="nv">' +
          esc(cellOf(npc, r, '钩子', '—')) +
          '</span></div>' +
          '<div class="xysb-krow"><span class="nk">最后出场</span><span class="nv">' +
          esc(cellOf(npc, r, '最后出场', '—')) +
          '</span></div>' +
          '</div>';
      });
      npcBox.innerHTML = nHtml || '<div class="xysb-empty">暂 无 人 物 档 案</div>';
    } else npcBox.innerHTML = '<div class="xysb-empty">暂 无 人 物 档 案</div>';

    // —— 敌情 ——
    const foeBox = $id('xysb-foes');
    if (foes && foes.rows.length) {
      let fHtml = '';
      foes.rows.forEach(function (r) {
        const fn = cellOf(foes, r, '名称', '—');
        if (fn === '—') return;
        const fhp = pair(cellOf(foes, r, '生命', '0'), Math.max(1, num(cellOf(foes, r, '生命上限', '100'), 100)));
        const fmax = num(cellOf(foes, r, '生命上限', String(fhp[1])), fhp[1]);
        if (fmax > 0) fhp[1] = fmax;
        fHtml +=
          '<div class="xysb-item" style="--accent:#e26d8c"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(fn) +
          '</span>' +
          chip('rose', cellOf(foes, r, '威胁', '')) +
          '</div>' +
          '<div class="xysb-mobhp"><span>生命</span><span>' +
          fhp[0] +
          ' / ' +
          fhp[1] +
          '</span></div>' +
          '<div class="xysb-mobbar"><div style="width:' +
          pct(fhp[0], fhp[1]) +
          '%"></div></div>' +
          '<div class="xysb-krow" style="margin-top:5px"><span class="nk">状态</span><span class="nv">' +
          esc(cellOf(foes, r, '状态', '—')) +
          '</span></div>' +
          '<div class="xysb-krow"><span class="nk">手段</span><span class="nv">' +
          esc(cellOf(foes, r, '手段', '—')) +
          '</span></div>' +
          '</div>';
      });
      foeBox.innerHTML = fHtml || '<div class="xysb-empty">当 前 无 在 场 敌 人</div>';
    } else foeBox.innerHTML = '<div class="xysb-empty">当 前 无 在 场 敌 人</div>';

    // —— 储物 ——
    const bagBox = $id('xysb-bag');
    if (bag && bag.rows.length) {
      let gHtml = '';
      bag.rows.forEach(function (r) {
        const inm = cellOf(bag, r, '物品名', '—');
        if (inm === '—') return;
        const note = cellOf(bag, r, '备注', '');
        gHtml +=
          '<div class="xysb-item"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(inm) +
          '</span>' +
          '<span class="xysb-cnt">×' +
          esc(cellOf(bag, r, '数量', '1')) +
          '</span>' +
          chip('blue', cellOf(bag, r, '类别', '')) +
          '</div>' +
          (note && note !== '—' ? '<div class="xysb-irow">' + esc(note) + '</div>' : '') +
          '</div>';
      });
      bagBox.innerHTML = gHtml || '<div class="xysb-empty">背 包 空 空</div>';
    } else bagBox.innerHTML = '<div class="xysb-empty">背 包 空 空</div>';

    const questBox = $id('xysb-quests');
    if (quest && quest.rows.length) {
      let qHtml = '';
      quest.rows.forEach(function (r) {
        const qn = cellOf(quest, r, '名称', '—');
        if (qn === '—') return;
        const qs = cellOf(quest, r, '状态', '—');
        const qcls = /完成|了结|达成/.test(qs)
          ? 'teal'
          : /失败|断绝/.test(qs)
            ? 'rose'
            : /进行|追查|未了/.test(qs)
              ? 'gold'
              : 'blue';
        qHtml +=
          '<div class="xysb-item" style="--accent:#4f8de0"><div class="xysb-itop"><span class="xysb-inm">' +
          esc(qn) +
          '</span>' +
          chip('blue', cellOf(quest, r, '类型', '')) +
          chip(qcls, qs) +
          '</div><div class="xysb-irow">' +
          esc(cellOf(quest, r, '进展', '—')) +
          '</div></div>';
      });
      questBox.innerHTML = qHtml || '<div class="xysb-empty">暂 无 挂 牵</div>';
    } else questBox.innerHTML = '<div class="xysb-empty">暂 无 挂 牵</div>';
  }

  // ──────────────────────────── 挂载与刷新 ────────────────────────────
  function ensureMount() {
    const chat = D.getElementById('chat');
    if (!chat) return;
    const mesList = chat.querySelectorAll('.mes');
    if (!mesList.length) {
      if (wrapper.isConnected) wrapper.remove();
      try {
        if (typeof W.__MVU_NPC_TOGGLE__ === 'function') W.__MVU_NPC_TOGGLE__(false);
      } catch (e) {}
      try {
        if (typeof W.__MVU_MON_TOGGLE__ === 'function') W.__MVU_MON_TOGGLE__(false);
      } catch (e) {}
      return;
    }
    const last = mesList[mesList.length - 1];
    const block = last.querySelector('.mes_block') || last;
    if (wrapper.parentNode !== block || block.lastElementChild !== wrapper) {
      block.appendChild(wrapper);
    }
  }

  let debounceTimer = null;
  function debouncedMount() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(ensureMount, 150);
  }

  const observer = new MO(debouncedMount);
  let observedChat = null;
  function startObserve() {
    const chat = D.getElementById('chat');
    if (chat && observedChat !== chat) {
      try {
        observer.disconnect();
      } catch (e) {}
      observer.observe(chat, { childList: true });
      observedChat = chat;
    }
  }

  let boundApi = null;
  function onTableUpdate() {
    try {
      render();
    } catch (e) {}
  }
  function bindApi() {
    const api = getDB();
    if (api && api !== boundApi) {
      boundApi = api;
      try {
        if (typeof api.registerTableUpdateCallback === 'function') {
          api.registerTableUpdateCallback(onTableUpdate);
        }
      } catch (e) {}
      try {
        render();
      } catch (e) {}
    }
  }

  // —— MVU 更新事件：每轮变量记账完成后立即刷新面板（比心跳更即时）——
  let mvuBound = false,
    mvuListeners = [];
  function bindMvu() {
    if (mvuBound) return;
    const M = getMvu(),
      on = resolveFn('eventOn');
    if (!M || !M.events || !on) return;
    function add(ev) {
      try {
        on(ev, onTableUpdate);
        mvuListeners.push(ev);
      } catch (e) {}
    }
    add(M.events.VARIABLE_UPDATE_ENDED);
    add(M.events.VARIABLE_INITIALIZED);
    mvuBound = true;
    try {
      render();
    } catch (e) {}
  }

  // ★ 修复：心跳里按需重渲染。原版心跳只做绑定/挂载，render() 仅在初始化与实时 MVU 事件时触发；
  //   重开旧对话时 MVU 数据是异步加载的，面板会卡在初始化那一次的空白默认值（见习/Lv.1/未定）。
  //   这里每轮检查 stat_data 是否变化，变了才重绘——既能在数据就绪后自动补上，又不会无谓刷新造成闪烁。
  let _xysbLastSig = null;
  function renderIfChanged() {
    try {
      const S = readStat();
      const sig = S ? JSON.stringify(S) : '__none__';
      if (sig !== _xysbLastSig) {
        _xysbLastSig = sig;
        render();
      }
    } catch (e) {}
  }
  const heartbeat = setInterval(function () {
    bindApi();
    bindMvu();
    startObserve();
    ensureMount();
    updateLaunchbar();
    renderIfChanged();
  }, 1500);

  W.__XYSB_CLEANUP__ = function () {
    try {
      clearInterval(heartbeat);
    } catch (e) {}
    try {
      observer.disconnect();
    } catch (e) {}
    try {
      wrapper.remove();
    } catch (e) {}
    try {
      const s = D.getElementById('xysb-style');
      if (s) s.remove();
    } catch (e) {}
    try {
      if (boundApi && typeof boundApi.unregisterTableUpdateCallback === 'function') {
        boundApi.unregisterTableUpdateCallback(onTableUpdate);
      }
    } catch (e) {}
    try {
      const off = resolveFn('eventRemoveListener') || resolveFn('eventOff');
      if (off)
        mvuListeners.forEach(function (ev) {
          try {
            off(ev, onTableUpdate);
          } catch (e) {}
        });
    } catch (e) {}
    try {
      delete W.__XYSB_CLEANUP__;
    } catch (e) {}
  };

  try {
    render();
  } catch (e) {}
  bindApi();
  bindMvu();
  startObserve();
  ensureMount();
})();
