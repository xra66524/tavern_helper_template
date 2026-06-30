(function () {
    'use strict';
    // ════════════════════════════════════════════════════════════════
    //  MVU 人物控制板 · NPC / Enemy Console
    //  · 读取 MVU 的 stat_data.重要人物 / 在场敌人（取数层与状态栏/监控器一致）
    //  · 展示关系/好感/生命/魔力/恶堕/手段/招式/钩子…
    //  · 手动控制：好感·生命·魔力增减 + 自定义指令 + 新增人物 → 一键注入聊天框
    //    （写法仿参考控制台：组织成 GM 指令注入 #send_textarea，由 AI 在本回合记账落实）
    //  · 开关不再是悬浮球：由状态栏顶部按钮 / 工具栏按钮切换；面板随聊天关闭自动收起
    // ════════════════════════════════════════════════════════════════

    var W;
    try { W = (window.parent && window.parent.document) ? window.parent : window; } catch (e) { W = window; }
    var D = W.document;
    var EV = W.Event || Event;

    // 是否为「手动再次运行脚本」（工具栏按钮）——用于决定本次运行是否直接打开面板
    var wasLoaded = false;
    try { wasLoaded = (typeof W.__MVU_NPC_CLEANUP__ === 'function'); } catch (e) {}
    try { if (W.__MVU_NPC_CLEANUP__) W.__MVU_NPC_CLEANUP__(); } catch (e) {}

    var PFX = 'mvunpc';
    var LS_PANEL = PFX + ':panel';
    var LS_OPEN = PFX + ':open';
    var LS_TAB = PFX + ':tab';

    // ──────────────── 通用工具（与状态栏同源）────────────────
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function num(v, d) {
        var m = String(v == null ? '' : v).match(/-?\d+(\.\d+)?/);
        if (!m) return (d === undefined ? 0 : d);
        return Math.round(parseFloat(m[0]));
    }
    function pct(cur, max) {
        if (!max || max <= 0) max = 100;
        var p = Math.round(cur / max * 100);
        return Math.max(0, Math.min(100, p));
    }
    function lsGet(k, d) { try { var v = W.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function lsSet(k, v) { try { W.localStorage.setItem(k, v); } catch (e) {} }
    function resolveFn(name) {
        try { if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name]; } catch (e) {}
        try { if (W && typeof W[name] === 'function') return W[name]; } catch (e) {}
        try { if (W && W.TavernHelper && typeof W.TavernHelper[name] === 'function') return W.TavernHelper[name].bind(W.TavernHelper); } catch (e) {}
        return null;
    }
    function getMvu() {
        try { if (typeof Mvu !== 'undefined' && Mvu) return Mvu; } catch (e) {}
        try { if (W && W.Mvu) return W.Mvu; } catch (e) {}
        try { if (window.Mvu) return window.Mvu; } catch (e) {}
        return null;
    }
    function latestId() {
        var f = resolveFn('getLastMessageId');
        if (f) { try { var v = f(); if (typeof v === 'number') return v; } catch (e) {} }
        return -1;
    }
    function readStat() {
        var id = latestId();
        var M = getMvu();
        if (M && typeof M.getMvuData === 'function') {
            try { var d = M.getMvuData({ type: 'message', message_id: 'latest' }); if (d && d.stat_data) return d.stat_data; } catch (e) {}
            try { var dc = M.getMvuData({ type: 'chat' }); if (dc && dc.stat_data) return dc.stat_data; } catch (e) {}
        }
        var gcm = resolveFn('getChatMessages');
        if (gcm) { try { var arr = gcm(id); if (arr && arr[0] && arr[0].data && arr[0].data.stat_data) return arr[0].data.stat_data; } catch (e) {} }
        var gv = resolveFn('getVariables');
        if (gv) {
            try { var v = gv({ type: 'message', message_id: id }); if (v && v.stat_data) return v.stat_data; } catch (e) {}
            try { var v2 = gv({ type: 'chat' }); if (v2 && v2.stat_data) return v2.stat_data; } catch (e) {}
        }
        return null;
    }
    function SG(v, d) {
        if (v === undefined || v === null) return (d === undefined ? '' : d);
        if (Array.isArray(v)) {
            if (v.length === 2 && typeof v[1] === 'string' && (typeof v[0] !== 'object' || v[0] === null)) return v[0];
            return v.length ? v[0] : (d === undefined ? '' : d);
        }
        return v;
    }
    function asObj(coll) { return (coll && typeof coll === 'object' && !Array.isArray(coll)) ? coll : {}; }

    var lastStat = null;
    function readColls() {
        var S = readStat();
        lastStat = S;
        if (!S) return null;
        return { npc: asObj(S.重要人物), enemy: asObj(S.在场敌人) };
    }

    // ──────────────── 注入聊天框（手动控制的落地方式）────────────────
    function injectToChat(txt) {
        if (!txt) return false;
        var ta = D.getElementById('send_textarea');
        if (!ta) { toast('未找到聊天输入框'); return false; }
        var cur = ta.value || '';
        ta.value = (cur.trim() === '') ? txt : (cur.replace(/\s+$/, '') + '\n' + txt);
        try { ta.dispatchEvent(new EV('input', { bubbles: true })); } catch (e) {}
        try { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } catch (e) {}
        toast('已注入聊天框，可再编辑或直接发送');
        return true;
    }
    function toast(msg) {
        var t = D.getElementById(PFX + '-toast'); if (!t) return;
        t.textContent = msg; t.classList.add('show');
        setTimeout(function () { t.classList.remove('show'); }, 1700);
    }

    // 每个 NPC 暂存的待注入增减量
    var pend = {};            // name -> {fav,hp,mp}
    function getPend(name) { if (!pend[name]) pend[name] = { fav: 0, hp: 0, mp: 0 }; return pend[name]; }
    function signed(n) { return (n > 0 ? '+' : '') + n; }

    function composeAdjust(name) {
        var p = getPend(name);
        var card = D.querySelector('.' + PFX + '-card[data-name="' + cssAttr(name) + '"]');
        var free = '', force = false;
        if (card) {
            var fe = card.querySelector('.' + PFX + '-free'); if (fe) free = fe.value.trim();
            var ce = card.querySelector('.' + PFX + '-force'); if (ce) force = ce.checked;
        }
        var parts = [];
        if (p.fav) parts.push('好感' + signed(p.fav));
        if (p.hp) parts.push('生命' + signed(p.hp));
        if (p.mp) parts.push('魔力' + signed(p.mp));
        var seg = [];
        if (parts.length) seg.push(parts.join('、'));
        if (free) seg.push(free);
        if (!seg.length) return '';
        if (force) return '【GM·绝对指令·针对' + name + '】' + seg.join('；') + '（最高优先级，必须无条件、即时、足量照演，并在本回合 UpdateVariable 中用 _.set 记账落实；不得弱化、不得反转。）';
        return '（GM 调整 ' + name + '：' + seg.join('；') + '，请在本回合记账中体现。）';
    }
    // 重要人物的完整字段表（用于「不留空·全部补全」）
    var NPC_FULL_FIELDS = '性别、身份、关系、好感(数值)、等级、生命{当前/上限}、魔力{当前/上限}、当前状态、恶堕(侵蚀阶段)、躯体(外貌白描)、招式、手段、钩子(心事/秘密)、最后出场';

    function composeAdd() {
        var name = inputVal(PFX + '-add-name');
        var rel = inputVal(PFX + '-add-rel'), idn = inputVal(PFX + '-add-ident'),
            fav = inputVal(PFX + '-add-fav'), stt = inputVal(PFX + '-add-state'), note = inputVal(PFX + '-add-note');
        var force = checkVal(PFX + '-add-force');
        var autoFill = checkVal(PFX + '-add-auto');   // 默认勾选：空缺由 AI 补全

        var given = [];
        if (rel) given.push('关系=' + rel);
        if (idn) given.push('身份=' + idn);
        if (fav !== '') given.push('好感=' + fav);
        if (stt) given.push('当前状态=' + stt);
        if (note) given.push('设定参考：' + note);

        var who = name ? ('「' + name + '」')
            : '一位本轮应当登场 / 已被提及却尚未建档的重要人物（姓名也请你按其身份气质拟定）';

        var parts = [];
        parts.push('在「重要人物」为' + who + '建档');
        parts.push(given.length ? ('；已指定：' + given.join('；')) : '');
        if (autoFill) {
            parts.push('。其余未指定字段——' + NPC_FULL_FIELDS + '——一律由你依据该人物的身份、阵营、战力标尺与当前剧情【合理生成并填全】；其中 躯体(外貌白描)、招式、手段、钩子 务必生成，绝不可留空；等级/生命/魔力 按战力标尺与其设定生成。凡此人物名下任一字段，宁可合理虚构也不得空缺。');
        } else {
            parts.push('。未指定的字段按记账字段表正常生成。');
        }
        parts.push('请在本回合末尾的 <UpdateVariable> 中，对上述每个字段用 _.set 逐条建项落实（对新路径直接 set 即自动新建）。');
        var body = parts.join('');
        if (force) return '【GM·绝对指令·新增/补全重要人物】' + body + '（最高优先级，必须无条件、即时、足量执行，本回合内完成全部建项。）';
        return '（GM·新增重要人物：' + body + '）';
    }
    // 自动捕捉：让 AI 扫描本回合正文，把未建档的登场人物一次性全部建档并补全
    function composeCapture() {
        var force = checkVal(PFX + '-cap-force');
        var body = '请扫描本回合正文（含最近剧情）中所有【有名有姓、或将持续互动、却尚未登记进「重要人物」】的角色，'
            + '本回合内一次性全部自动建档：每人按字段表把 ' + NPC_FULL_FIELDS + ' 全部合理生成并填全，'
            + '尤其 躯体(外貌白描)、招式、手段、钩子 绝不留空（宁可合理虚构）；'
            + '在场的敌对者同时登记进「在场敌人」(威胁/生命{当前,上限}/手段/状态)。'
            + '在本回合末尾的 <UpdateVariable> 中，对每个新建字段用 _.set 逐条落实。';
        if (force) return '【GM·绝对指令·自动捕捉登场人物】' + body + '（最高优先级，必须无条件、即时、足量执行。）';
        return '（GM·自动捕捉登场人物：' + body + '）';
    }
    function cssAttr(s) { return String(s).replace(/"/g, '\\"'); }
    function inputVal(id) { var e = D.getElementById(id); return e ? String(e.value).trim() : ''; }
    function checkVal(id) { var e = D.getElementById(id); return !!(e && e.checked); }

    // ──────────────── 渲染辅助 ────────────────
    function bar(fillCls, p) { return '<div class="' + PFX + '-bar"><div class="' + fillCls + '" style="width:' + p + '%"></div></div>'; }
    function chip(text, cls) { if (text === '' || text == null) return ''; return '<span class="' + PFX + '-chip' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</span>'; }
    function row(label, value, extraCls) {
        if (value === '' || value == null) return '';
        return '<div class="' + PFX + '-row' + (extraCls ? ' ' + extraCls : '') + '"><span class="' + PFX + '-rl">' + esc(label) + '</span><span class="' + PFX + '-rv">' + esc(value) + '</span></div>';
    }
    function relClass(rel) {
        var s = String(rel || '');
        if (/敌|仇|对手|宿敌|魔人|叛/.test(s)) return 'rel-foe';
        if (/队友|同伴|盟|挚友|恋|师|引路/.test(s)) return 'rel-ally';
        if (/同学|室友|熟人|邻/.test(s)) return 'rel-near';
        return '';
    }
    function favClass(n) { if (n == null) return ''; if (n < 0) return 'fav-neg'; if (n >= 70) return 'fav-high'; if (n >= 35) return 'fav-mid'; return 'fav-low'; }
    function threatClass(t) {
        var s = String(t || '').toUpperCase();
        if (/极|S|SS|A|致命|危/.test(s)) return 'th-hi';
        if (/高|B|C|强/.test(s)) return 'th-mid';
        if (/低|D|E|F|弱/.test(s)) return 'th-lo';
        return '';
    }
    var CORR_STAGES = ['未染', '初蚀', '沉沦', '半堕', '恶堕'];
    function corrIdx(s) { var i = CORR_STAGES.indexOf(String(s == null ? '' : s).trim()); return i < 0 ? 0 : i; }
    function corrPips(idx) { var out = ''; for (var i = 1; i <= 4; i++) out += '<i class="' + PFX + '-pip' + (i <= idx ? ' on s' + idx : '') + '"></i>'; return out; }

    var collapsed = {};   // name -> true(收起)

    // 控制区（增减 + 自定义指令 + 注入），随展开的卡显示
    function controlsHTML(name) {
        var p = getPend(name);
        function step(label, f) {
            return '<div class="' + PFX + '-step"><span class="' + PFX + '-slbl">' + label + '</span>'
                + '<button class="' + PFX + '-sbtn" data-name="' + esc(name) + '" data-f="' + f + '" data-d="-5">−</button>'
                + '<span class="' + PFX + '-sd" data-name="' + esc(name) + '" data-f="' + f + '">' + (p[f] ? signed(p[f]) : '0') + '</span>'
                + '<button class="' + PFX + '-sbtn" data-name="' + esc(name) + '" data-f="' + f + '" data-d="5">+</button></div>';
        }
        return '<div class="' + PFX + '-ctl">'
            + '<div class="' + PFX + '-steps">' + step('好感', 'fav') + step('生命', 'hp') + step('魔力', 'mp') + '</div>'
            + '<textarea class="' + PFX + '-free" rows="2" placeholder="对该人物的自定义指令（如：让她主动来找主角、透露一条线索…）"></textarea>'
            + '<label class="' + PFX + '-forcelbl"><input type="checkbox" class="' + PFX + '-force"> 强制 GM（绝对指令）</label>'
            + '<button class="' + PFX + '-inject" data-name="' + esc(name) + '">⮕ 注入聊天框</button>'
            + '</div>';
    }

    function npcCardHTML(name, o) {
        o = o || {};
        var rel = SG(o.关系, ''), idn = SG(o.身份, ''), sex = SG(o.性别, ''), lvl = SG(o.等级, '');
        var favRaw = SG(o.好感, ''), favN = (favRaw === '' ? null : num(favRaw, null));
        var hpC = num(SG((o.生命 || {}).当前, ''), null), hpM = num(SG((o.生命 || {}).上限, ''), null);
        var mpC = num(SG((o.魔力 || {}).当前, ''), null), mpM = num(SG((o.魔力 || {}).上限, ''), null);
        var stt = SG(o.当前状态, ''), corr = SG(o.恶堕, ''), body = SG(o.躯体, '');
        var skill = SG(o.招式, ''), means = SG(o.手段, ''), hook = SG(o.钩子, ''), last = SG(o.最后出场, '');
        var ci = corrIdx(corr);
        var isCol = !!collapsed[name];

        var meta = chip(rel, relClass(rel)) + chip(idn) + chip(sex) + (lvl !== '' ? chip('Lv.' + lvl, 'lv') : '');
        var bars = '';
        if (favN != null) {
            bars += '<div class="' + PFX + '-bl"><span class="' + PFX + '-bk">好感</span><span class="' + PFX + '-bn ' + favClass(favN) + '">' + esc(favN) + '</span></div>' + bar('f-fav ' + favClass(favN), pct(Math.max(0, favN), 100));
        }
        if (hpC != null || hpM != null) {
            var hpc = hpC == null ? 0 : hpC, hpm = hpM == null ? (hpc || 100) : hpM;
            bars += '<div class="' + PFX + '-bl"><span class="' + PFX + '-bk">生命</span><span class="' + PFX + '-bn">' + esc(hpc) + ' / ' + esc(hpm) + '</span></div>' + bar('f-hp', pct(hpc, hpm));
        }
        if (mpC != null || mpM != null) {
            var mpc = mpC == null ? 0 : mpC, mpm = mpM == null ? (mpc || 100) : mpM;
            bars += '<div class="' + PFX + '-bl"><span class="' + PFX + '-bk">魔力</span><span class="' + PFX + '-bn">' + esc(mpc) + ' / ' + esc(mpm) + '</span></div>' + bar('f-mana', pct(mpc, mpm));
        }
        var corrHtml = '';
        if (ci > 0 || (corr && corr !== '未染')) {
            corrHtml = '<div class="' + PFX + '-corr s' + ci + '"><span class="' + PFX + '-bk">侵蚀</span><span class="' + PFX + '-pips">' + corrPips(ci) + '</span><span class="' + PFX + '-cstage">' + esc(corr || CORR_STAGES[ci]) + '</span></div>';
        }
        var details = row('状态', stt) + row('手段', means) + row('招式', skill) + row('躯体', body)
            + (hook ? '<div class="' + PFX + '-hook"><span class="' + PFX + '-hookicon">🔒</span><span class="' + PFX + '-hooktx">' + esc(hook) + '</span></div>' : '')
            + row('最后出场', last, 'last');

        return '<div class="' + PFX + '-card' + (isCol ? ' collapsed' : '') + '" data-name="' + esc(name) + '">'
            + '<div class="' + PFX + '-chead" data-name="' + esc(name) + '">'
            + '<span class="' + PFX + '-arrow">' + (isCol ? '▸' : '▾') + '</span>'
            + '<span class="' + PFX + '-cname">' + esc(name) + '</span>'
            + '<span class="' + PFX + '-cmeta">' + (meta || '<span class="' + PFX + '-muted">—</span>') + '</span></div>'
            + '<div class="' + PFX + '-cbody">'
            + (bars ? '<div class="' + PFX + '-bars">' + bars + '</div>' : '') + corrHtml
            + (details ? '<div class="' + PFX + '-details">' + details + '</div>' : '')
            + controlsHTML(name)
            + '</div></div>';
    }

    function enemyCardHTML(name, o) {
        o = o || {};
        var threat = SG(o.威胁, ''), means = SG(o.手段, ''), stt = SG(o.状态, '');
        var hpC = num(SG((o.生命 || {}).当前, ''), null), hpM = num(SG((o.生命 || {}).上限, ''), null);
        var bars = '';
        if (hpC != null || hpM != null) {
            var hpc = hpC == null ? 0 : hpC, hpm = hpM == null ? (hpc || 100) : hpM;
            bars += '<div class="' + PFX + '-bl"><span class="' + PFX + '-bk">生命</span><span class="' + PFX + '-bn">' + esc(hpc) + ' / ' + esc(hpm) + '</span></div>' + bar('f-foe', pct(hpc, hpm));
        }
        var details = row('手段', means) + row('状态', stt);
        return '<div class="' + PFX + '-card foe" data-name="' + esc(name) + '">'
            + '<div class="' + PFX + '-chead static"><span class="' + PFX + '-cname foe">' + esc(name) + '</span>'
            + (threat !== '' ? '<span class="' + PFX + '-threat ' + threatClass(threat) + '">威胁 ' + esc(threat) + '</span>' : '') + '</div>'
            + '<div class="' + PFX + '-cbody">' + (bars ? '<div class="' + PFX + '-bars">' + bars + '</div>' : '')
            + (details ? '<div class="' + PFX + '-details">' + details + '</div>' : '') + '</div></div>';
    }

    function addFormHTML() {
        return '<div class="' + PFX + '-addform">'
            + '<div class="' + PFX + '-capbox">'
            +   '<div class="' + PFX + '-captx">⚡ <b>自动捕捉</b>：让 AI 扫描本回合正文（含最近剧情），把所有有名有姓 / 将持续互动、却还没建档的人物一次性登记进「重要人物」，每人的躯体白描·招式·手段·钩子·恶堕·生命·魔力…全部自动生成填全，绝不留空。</div>'
            +   '<label class="' + PFX + '-forcelbl"><input type="checkbox" id="' + PFX + '-cap-force"> 强制 GM（绝对指令）</label>'
            +   '<button class="' + PFX + '-capbtn" id="' + PFX + '-cap-go">⚡ 自动捕捉当前登场人物</button>'
            + '</div>'
            + '<div class="' + PFX + '-or">或 · 指定建档（留空字段照样由 AI 补全）</div>'
            + '<div class="' + PFX + '-addhint">填多少都行——没填的字段会由 AI 依设定合理生成、填全，不会留空。填好后点「注入聊天框」发送，由 AI 本回合写入变量。</div>'
            + fld('姓名', PFX + '-add-name', '可留空（留空则由 AI 取名）')
            + fld('关系', PFX + '-add-rel', '留空＝AI 按剧情判定')
            + fld('身份', PFX + '-add-ident', '留空＝AI 自拟')
            + fld('好感', PFX + '-add-fav', '留空＝AI 给初值', 'number')
            + fld('当前状态', PFX + '-add-state', '留空＝AI 按情景填')
            + '<div class="' + PFX + '-fld"><label>设定参考</label><textarea id="' + PFX + '-add-note" rows="2" placeholder="外貌/性格/与主角的渊源等；可留空，AI 会自行生成"></textarea></div>'
            + '<label class="' + PFX + '-forcelbl"><input type="checkbox" id="' + PFX + '-add-auto" checked> 空缺字段由 AI 自动补全（含躯体白描 / 招式 / 手段 / 钩子等）</label>'
            + '<label class="' + PFX + '-forcelbl"><input type="checkbox" id="' + PFX + '-add-force"> 强制 GM（绝对指令）</label>'
            + '<div class="' + PFX + '-addbtns"><button class="' + PFX + '-inject" id="' + PFX + '-add-inject">⮕ 注入聊天框</button>'
            + '<button class="' + PFX + '-clearbtn" id="' + PFX + '-add-clear">清空</button></div>'
            + '</div>';
    }
    function fld(label, id, ph, type) {
        return '<div class="' + PFX + '-fld"><label>' + esc(label) + '</label><input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + esc(ph) + '"></div>';
    }

    function matchQ(name, o) {
        if (!query) return true;
        try { return (name + ' ' + JSON.stringify(o)).toLowerCase().indexOf(query.toLowerCase()) !== -1; }
        catch (e) { return name.toLowerCase().indexOf(query.toLowerCase()) !== -1; }
    }

    var activeTab = lsGet(LS_TAB, 'npc');
    var query = '';

    function renderBody() {
        if (activeTab === 'add') { setStatus('ok', '手动建档'); return addFormHTML(); }
        var c = readColls();
        if (!c) { setStatus('warn', '尚未读到变量'); return '<div class="' + PFX + '-empty">尚未读到 stat_data。<br>请确认：① 已启用 MVU 本体脚本　② 世界书含 [InitVar] 条目　③ 已发出至少一条消息完成初始化。</div>'; }
        setStatus('ok', '已同步');
        var coll = activeTab === 'enemy' ? c.enemy : c.npc;
        var names = Object.keys(coll).filter(function (n) { return matchQ(n, coll[n]); });
        if (!names.length) {
            if (query) return '<div class="' + PFX + '-empty">无匹配「' + esc(query) + '」的条目。</div>';
            return activeTab === 'enemy'
                ? '<div class="' + PFX + '-empty">当前无敌人在场。<br><span class="' + PFX + '-muted">进入战斗后，AI 会把魔物/魔人登记到这里。</span></div>'
                : '<div class="' + PFX + '-empty">暂无登场人物。<br><span class="' + PFX + '-muted">让 AI 自动建账，或切到「＋新增」用「⚡自动捕捉」一键登记当前登场人物。</span></div>';
        }
        var html = '', maker = activeTab === 'enemy' ? enemyCardHTML : npcCardHTML;
        for (var i = 0; i < names.length; i++) html += maker(names[i], coll[names[i]]);
        return html;
    }

    function paint() {
        var body = D.getElementById(PFX + '-body'); if (!body) return;
        var prev = body.scrollTop;
        body.innerHTML = renderBody();
        body.scrollTop = prev;
        var c = lastStat ? { npc: asObj(lastStat.重要人物), enemy: asObj(lastStat.在场敌人) } : null;
        var tn = D.getElementById(PFX + '-cnt-npc'), te = D.getElementById(PFX + '-cnt-enemy');
        if (tn) tn.textContent = c ? Object.keys(c.npc).length : 0;
        if (te) te.textContent = c ? Object.keys(c.enemy).length : 0;
        wire();
    }
    function wire() {
        if (activeTab === 'add') {
            var ib = D.getElementById(PFX + '-add-inject'); if (ib) ib.onclick = function () { var t = composeAdd(); if (t) injectToChat(t); };
            var capb = D.getElementById(PFX + '-cap-go'); if (capb) capb.onclick = function () { var t = composeCapture(); if (t) injectToChat(t); };
            var cb = D.getElementById(PFX + '-add-clear'); if (cb) cb.onclick = function () {
                ['name', 'rel', 'ident', 'fav', 'state', 'note'].forEach(function (k) { var e = D.getElementById(PFX + '-add-' + k); if (e) e.value = ''; });
                var f = D.getElementById(PFX + '-add-force'); if (f) f.checked = false;
                var a = D.getElementById(PFX + '-add-auto'); if (a) a.checked = true;
                var cf = D.getElementById(PFX + '-cap-force'); if (cf) cf.checked = false;
            };
            return;
        }
        var heads = D.querySelectorAll('#' + PFX + '-body .' + PFX + '-chead:not(.static)');
        for (var i = 0; i < heads.length; i++) {
            heads[i].onclick = function () {
                var n = this.getAttribute('data-name');
                collapsed[n] = !collapsed[n];
                this.parentNode.classList.toggle('collapsed', collapsed[n]);
                var a = this.querySelector('.' + PFX + '-arrow'); if (a) a.textContent = collapsed[n] ? '▸' : '▾';
            };
        }
        // 增减步进
        D.querySelectorAll('#' + PFX + '-body .' + PFX + '-sbtn').forEach(function (b) {
            b.onclick = function () {
                var n = this.getAttribute('data-name'), f = this.getAttribute('data-f'), d = parseInt(this.getAttribute('data-d'), 10);
                var p = getPend(n); p[f] = (p[f] || 0) + d;
                var disp = D.querySelector('#' + PFX + '-body .' + PFX + '-sd[data-name="' + cssAttr(n) + '"][data-f="' + f + '"]');
                if (disp) disp.textContent = p[f] ? signed(p[f]) : '0';
            };
        });
        // 注入
        D.querySelectorAll('#' + PFX + '-body .' + PFX + '-inject').forEach(function (b) {
            b.onclick = function () {
                var n = this.getAttribute('data-name'); if (!n) return;
                var t = composeAdjust(n);
                if (!t) { toast('先调整数值或填写指令'); return; }
                if (injectToChat(t)) { var p = getPend(n); p.fav = p.hp = p.mp = 0; paint(); }
            };
        });
    }
    function setTab(t) {
        activeTab = t; lsSet(LS_TAB, t);
        var tabs = D.querySelectorAll('#' + PFX + '-panel .' + PFX + '-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === t);
        paint();
    }
    function setStatus(level, text) {
        var dot = D.getElementById(PFX + '-dot'); if (dot) { dot.className = PFX + '-dot lvl-' + level; dot.title = text; }
    }

    // ──────────────── 样式 ────────────────
    function injectStyle() {
        if (D.getElementById(PFX + '-style')) return;
        var css = `
#${PFX}-panel{position:fixed;top:60px;right:16px;width:350px;max-width:94vw;z-index:99997;
 font:13px/1.55 'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
 --nv-pbase:var(--SmartThemeBlurTintColor,#eef0fb);
 --nv-pbase2:var(--SmartThemeChatTintColor,#ffffff);
 --nv-text:var(--SmartThemeBodyColor,#3a3f63);
 --nv-accent:var(--SmartThemeQuoteColor,#8b6fe6);
 --nv-panel:color-mix(in srgb,var(--nv-pbase) 90%,transparent);
 --nv-panel2:color-mix(in srgb,var(--nv-pbase2) 80%,transparent);
 --nv-t2:color-mix(in srgb,var(--nv-text) 82%,transparent);
 --nv-t3:color-mix(in srgb,var(--nv-text) 56%,transparent);
 --nv-t4:color-mix(in srgb,var(--nv-text) 38%,transparent);
 --nv-bord:color-mix(in srgb,var(--nv-text) 17%,transparent);
 --nv-bord2:color-mix(in srgb,var(--nv-text) 10%,transparent);
 --nv-track:color-mix(in srgb,var(--nv-text) 14%,transparent);
 --nv-fill:color-mix(in srgb,var(--nv-text) 5%,transparent);
 --nv-soft:color-mix(in srgb,var(--nv-accent) 16%,transparent);
 --nv-soft2:color-mix(in srgb,var(--nv-accent) 34%,transparent);
 --nv-shadow:var(--SmartThemeShadowColor,rgba(20,22,30,.32));
 color:var(--nv-text);
 background:var(--nv-panel);border:1px solid var(--nv-bord);border-radius:16px;
 box-shadow:0 14px 48px var(--nv-shadow);overflow:hidden;-webkit-backdrop-filter:blur(11px);backdrop-filter:blur(11px);
 display:none;max-height:80vh;flex-direction:column}
body[data-xysb-theme="auto"][data-xysb-auto] #${PFX}-panel{
 --nv-pbase:var(--xysb-smp-pbase,var(--SmartThemeBlurTintColor,#eef0fb));
 --nv-pbase2:var(--xysb-smp-pbase2,var(--SmartThemeChatTintColor,#ffffff));
 --nv-text:var(--xysb-smp-text,var(--SmartThemeBodyColor,#3a3f63));
 --nv-accent:var(--xysb-smp-accent,var(--SmartThemeQuoteColor,#8b6fe6))}
body[data-xysb-theme="light"] #${PFX}-panel{--nv-pbase:#eef0fb;--nv-pbase2:#ffffff;--nv-text:#3a3f63;--nv-accent:#6b6fd8}
body[data-xysb-theme="dark"] #${PFX}-panel{--nv-pbase:#23252f;--nv-pbase2:#2b2d3a;--nv-text:#e6e8f4;--nv-accent:#a98cf0}
#${PFX}-panel.show{display:flex}
#${PFX}-head{display:flex;align-items:center;gap:7px;padding:11px 13px;cursor:move;user-select:none;flex:0 0 auto;
 background:color-mix(in srgb,var(--nv-pbase2) 60%,transparent);border-bottom:1px solid var(--nv-bord)}
#${PFX}-ttl{font-family:'Kaiti SC','KaiTi','STKaiti','楷体','Noto Serif SC',serif;font-weight:700;font-size:16px;letter-spacing:3px;color:var(--nv-accent);flex:0 0 auto}
.${PFX}-dot{width:9px;height:9px;border-radius:50%;background:var(--nv-t4);transition:.3s;flex:0 0 auto}
.${PFX}-dot.lvl-ok{background:#46c07e}.${PFX}-dot.lvl-warn{background:#d7a23a}.${PFX}-dot.lvl-err{background:#d35563}
#${PFX}-head .sp{flex:1 1 auto}
.${PFX}-hbtn,.${PFX}-themebtn{cursor:pointer;border:1px solid var(--nv-bord);background:var(--nv-panel2);color:var(--nv-t2);border-radius:7px;padding:3px 8px;font-size:13px;line-height:1;transition:.15s}
.${PFX}-hbtn:hover,.${PFX}-themebtn:hover{color:var(--nv-text);border-color:var(--nv-text)}
.${PFX}-themebtn{border-radius:20px}
.${PFX}-themebtn::after{content:"◑"}
body[data-xysb-theme="light"] .${PFX}-themebtn::after{content:"☀"}
body[data-xysb-theme="dark"] .${PFX}-themebtn::after{content:"☾"}
#${PFX}-tabs{display:flex;gap:5px;padding:8px 10px 4px;flex:0 0 auto}
.${PFX}-tab{flex:1;text-align:center;padding:7px 0;cursor:pointer;color:var(--nv-t3);font-size:12.5px;letter-spacing:1px;
 background:color-mix(in srgb,var(--nv-text) 6%,transparent);border:1px solid transparent;border-radius:9px;transition:.18s;font-weight:600}
.${PFX}-tab:hover{color:var(--nv-text)}
.${PFX}-tab.active{color:var(--nv-accent);background:var(--nv-soft);border-color:var(--nv-soft2)}
.${PFX}-tab .${PFX}-num{display:inline-block;min-width:16px;margin-left:4px;padding:0 5px;font-size:10.5px;font-weight:700;border-radius:10px;background:color-mix(in srgb,var(--nv-text) 12%,transparent);color:var(--nv-accent);vertical-align:1px}
#${PFX}-search{padding:4px 10px 8px;flex:0 0 auto}
#${PFX}-search input{width:100%;box-sizing:border-box;background:var(--nv-fill);border:1px solid var(--nv-bord);color:var(--nv-text);border-radius:9px;padding:6px 10px;font:inherit;outline:none}
#${PFX}-search input::placeholder{color:var(--nv-t4)}
#${PFX}-body{overflow:auto;padding:2px 10px 12px;flex:1 1 auto;-webkit-overflow-scrolling:touch}
.${PFX}-card{background:var(--nv-panel2);border:1px solid var(--nv-bord2);border-radius:13px;margin-bottom:9px;overflow:hidden}
.${PFX}-card.foe{border-color:color-mix(in srgb,#d35563 32%,transparent)}
.${PFX}-chead{display:flex;align-items:center;gap:7px;padding:9px 12px;cursor:pointer;flex-wrap:wrap}
.${PFX}-chead.static{cursor:default}
.${PFX}-arrow{width:11px;color:var(--nv-accent);font-size:11px;flex:0 0 auto}
.${PFX}-cname{font-family:'Kaiti SC','KaiTi','STKaiti','楷体','Noto Serif SC',serif;font-size:16px;font-weight:700;letter-spacing:1px;color:var(--nv-text);flex:0 0 auto}
.${PFX}-cname.foe{color:#d35563}
.${PFX}-cmeta{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-left:2px}
.${PFX}-chip{font-size:11px;line-height:1.3;padding:2px 8px;border-radius:11px;background:var(--nv-soft);border:1px solid var(--nv-soft2);color:var(--nv-accent);white-space:nowrap}
.${PFX}-chip.lv{color:#5a7fd0;background:color-mix(in srgb,#5a7fd0 14%,transparent);border-color:color-mix(in srgb,#5a7fd0 38%,transparent)}
.${PFX}-chip.rel-ally{color:#2fa56e;background:color-mix(in srgb,#2fa56e 14%,transparent);border-color:color-mix(in srgb,#2fa56e 40%,transparent)}
.${PFX}-chip.rel-foe{color:#d35563;background:color-mix(in srgb,#d35563 14%,transparent);border-color:color-mix(in srgb,#d35563 42%,transparent)}
.${PFX}-chip.rel-near{color:#c0902e;background:color-mix(in srgb,#c0902e 15%,transparent);border-color:color-mix(in srgb,#c0902e 40%,transparent)}
.${PFX}-threat{margin-left:auto;font-size:11px;font-weight:700;padding:2px 9px;border-radius:11px;background:color-mix(in srgb,var(--nv-text) 8%,transparent);border:1px solid var(--nv-bord);color:var(--nv-t2)}
.${PFX}-threat.th-hi{color:#d35563;background:color-mix(in srgb,#d35563 16%,transparent);border-color:color-mix(in srgb,#d35563 48%,transparent)}
.${PFX}-threat.th-mid{color:#cc7a28;background:color-mix(in srgb,#cc7a28 15%,transparent);border-color:color-mix(in srgb,#cc7a28 46%,transparent)}
.${PFX}-threat.th-lo{color:#c0902e;background:color-mix(in srgb,#c0902e 14%,transparent);border-color:color-mix(in srgb,#c0902e 42%,transparent)}
.${PFX}-card.collapsed .${PFX}-cbody{display:none}
.${PFX}-cbody{padding:2px 12px 11px}
.${PFX}-bars{margin:3px 0 7px}
.${PFX}-bl{display:flex;justify-content:space-between;align-items:baseline;margin:5px 0 2px;font-size:11px}
.${PFX}-bk{color:var(--nv-t3);letter-spacing:1px}
.${PFX}-bn{color:var(--nv-t2);font-variant-numeric:tabular-nums}
.${PFX}-bn.fav-high{color:#2fa56e}.${PFX}-bn.fav-mid{color:#c0902e}.${PFX}-bn.fav-low{color:var(--nv-t2)}.${PFX}-bn.fav-neg{color:#d35563}
.${PFX}-bar{height:9px;border-radius:5px;background:var(--nv-track);overflow:hidden}
.${PFX}-bar>div{height:100%;border-radius:5px;transition:width .45s;background-size:200% 100%;animation:${PFX}-flow 3.4s linear infinite}
.${PFX}-bar>.f-hp{background-image:linear-gradient(90deg,#f4798f,#f9a8b8,#f4798f);box-shadow:0 0 7px rgba(244,121,143,.35)}
.${PFX}-bar>.f-foe{background-image:linear-gradient(90deg,#e0707a,#f0a0a8,#e0707a);box-shadow:0 0 7px rgba(224,112,122,.35)}
.${PFX}-bar>.f-mana{background-image:linear-gradient(90deg,#8b7cf6,#5aa2f7,#8b7cf6);box-shadow:0 0 7px rgba(122,124,243,.38)}
.${PFX}-bar>.f-fav{background-image:linear-gradient(90deg,#f0a86a,#f4cf8a,#f0a86a);box-shadow:0 0 7px rgba(240,168,106,.35)}
.${PFX}-bar>.f-fav.fav-high{background-image:linear-gradient(90deg,#5cbf78,#88d3a0,#5cbf78)}
.${PFX}-bar>.f-fav.fav-neg{background-image:linear-gradient(90deg,#9aa0c0,#c0c6e0,#9aa0c0);box-shadow:none}
@keyframes ${PFX}-flow{0%{background-position:0 0}100%{background-position:200% 0}}
.${PFX}-corr{display:flex;align-items:center;gap:7px;margin:2px 0 7px;font-size:11px}
.${PFX}-pips{display:flex;gap:4px}
.${PFX}-pip{width:13px;height:6px;border-radius:3px;background:var(--nv-track)}
.${PFX}-pip.on.s1{background:#d7a23a}.${PFX}-pip.on.s2{background:#dd8a3a}.${PFX}-pip.on.s3{background:#a05fc0}.${PFX}-pip.on.s4{background:#d35563}
.${PFX}-cstage{color:var(--nv-t2);letter-spacing:1px}
.${PFX}-details{border-top:1px dashed var(--nv-bord);padding-top:6px;margin-top:2px}
.${PFX}-row{display:flex;gap:8px;padding:2px 0;font-size:12px;align-items:baseline}
.${PFX}-rl{flex:0 0 52px;color:var(--nv-t3);letter-spacing:1px}
.${PFX}-rv{flex:1;color:var(--nv-t2);word-break:break-word}
.${PFX}-row.last .${PFX}-rv{color:var(--nv-t3);font-style:italic}
.${PFX}-hook{display:flex;gap:7px;align-items:flex-start;margin:5px 0 1px;padding:6px 9px;border-radius:9px;background:var(--nv-soft);border:1px solid var(--nv-soft2)}
.${PFX}-hookicon{flex:0 0 auto;font-size:11px;opacity:.85}
.${PFX}-hooktx{flex:1;font-size:12px;font-style:italic;color:var(--nv-t2)}
/* 控制区 */
.${PFX}-ctl{border-top:1px solid var(--nv-bord);margin-top:8px;padding-top:8px}
.${PFX}-steps{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}
.${PFX}-step{display:flex;align-items:center;gap:5px;background:var(--nv-fill);border-radius:9px;padding:3px 5px}
.${PFX}-slbl{font-size:11px;color:var(--nv-t3);letter-spacing:1px}
.${PFX}-sbtn{width:22px;height:22px;border:none;border-radius:6px;background:var(--nv-soft);color:var(--nv-accent);font-size:15px;line-height:1;cursor:pointer}
.${PFX}-sbtn:hover{background:var(--nv-soft2)}
.${PFX}-sd{min-width:26px;text-align:center;font-size:12px;color:var(--nv-t2);font-variant-numeric:tabular-nums}
.${PFX}-free,.${PFX}-addform textarea,.${PFX}-addform input{width:100%;box-sizing:border-box;background:var(--nv-fill);border:1px solid var(--nv-bord);color:var(--nv-text);border-radius:8px;padding:6px 9px;font:inherit;outline:none;resize:vertical}
.${PFX}-free::placeholder,.${PFX}-addform ::placeholder{color:var(--nv-t4)}
.${PFX}-forcelbl{display:flex;align-items:center;gap:6px;margin:7px 0;font-size:11.5px;color:var(--nv-t2);cursor:pointer}
.${PFX}-inject{width:100%;border:none;border-radius:9px;padding:8px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;
 background:linear-gradient(135deg,color-mix(in srgb,var(--nv-accent) 92%,#fff),color-mix(in srgb,var(--nv-accent) 70%,#000));transition:filter .15s}
.${PFX}-inject:hover{filter:brightness(1.1)}
/* 新增表单 */
.${PFX}-addform{padding:4px 2px 6px}
.${PFX}-addhint{font-size:11.5px;color:var(--nv-t3);line-height:1.6;margin-bottom:9px}
.${PFX}-capbox{margin:0 0 11px;padding:9px 10px;border-radius:11px;background:var(--nv-soft);border:1px solid var(--nv-soft2)}
.${PFX}-captx{font-size:11.5px;color:var(--nv-t2);line-height:1.55;margin-bottom:7px}
.${PFX}-capbtn{width:100%;border:none;border-radius:9px;padding:8px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,color-mix(in srgb,var(--nv-accent) 90%,#fff),color-mix(in srgb,var(--nv-accent) 62%,#000));transition:filter .15s}
.${PFX}-capbtn:hover{filter:brightness(1.1)}
.${PFX}-or{display:flex;align-items:center;gap:8px;margin:3px 0 9px;color:var(--nv-t4);font-size:11px;letter-spacing:.5px}
.${PFX}-or::before,.${PFX}-or::after{content:"";flex:1;height:1px;background:var(--nv-bord)}
.${PFX}-fld{margin-bottom:8px}
.${PFX}-fld label{display:block;font-size:11.5px;color:var(--nv-t3);letter-spacing:1px;margin-bottom:3px}
.${PFX}-addbtns{display:flex;gap:8px;margin-top:4px}
.${PFX}-addbtns .${PFX}-inject{flex:1}
.${PFX}-clearbtn{flex:0 0 auto;border:1px solid var(--nv-bord);background:transparent;color:var(--nv-t2);border-radius:9px;padding:8px 14px;font-size:12.5px;cursor:pointer}
.${PFX}-clearbtn:hover{border-color:var(--nv-text);color:var(--nv-text)}
.${PFX}-empty{color:var(--nv-t3);padding:26px 14px;text-align:center;line-height:1.9}
.${PFX}-muted{color:var(--nv-t4);font-size:11.5px}
#${PFX}-toast{position:absolute;left:50%;bottom:12px;transform:translateX(-50%) translateY(8px);background:var(--nv-panel);border:1px solid var(--nv-soft2);
 color:var(--nv-text);font-size:12px;padding:7px 13px;border-radius:10px;opacity:0;pointer-events:none;transition:.25s;white-space:nowrap;z-index:5;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#${PFX}-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:480px){#${PFX}-panel{width:96vw;right:2vw;top:54px;max-height:76vh}}
`;
        var st = D.createElement('style'); st.id = PFX + '-style'; st.textContent = css;
        (D.head || D.documentElement).appendChild(st);
    }

    // ──────────────── 主题：与状态栏同款「自适应 / 亮 / 暗」 ────────────────
    // 优先复用状态栏在 <body> 上写入的 data-xysb-theme / data-xysb-auto / --xysb-smp-* ；
    // 状态栏没加载时本面板自带一份背景采样兜底，单独使用也能跟随明暗自适应。
    function _npcParseRGB(str) {
        if (!str) return null; str = String(str).trim();
        var r, g, b, m = str.match(/rgba?\(([^)]+)\)/);
        if (m) { var a = m[1].split(',').map(parseFloat); r = a[0]; g = a[1]; b = a[2]; }
        else if (str.charAt(0) === '#') { var h = str.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
        else return null;
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null; return { r: r, g: g, b: b };
    }
    function _npcApplyRGB(c) {
        var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, ss = 0, l = (mx + mn) / 2;
        if (mx !== mn) { var dd = mx - mn; ss = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); if (mx === r) h = (g - b) / dd + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h /= 6; }
        h = Math.round(h * 360);
        var lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255, dark = lum < 0.45;
        var Sp = Math.min(Math.max(ss, 0.18), 0.45), St = Math.min(ss, 0.20);
        var pL = dark ? 34 : 93, p2L = dark ? 42 : 97, tL = dark ? 92 : 24;
        function HS(s2, l2) { return 'hsl(' + h + ',' + Math.round(s2 * 100) + '%,' + l2 + '%)'; }
        try {
            D.body.style.setProperty('--xysb-smp-pbase', HS(Sp, pL));
            D.body.style.setProperty('--xysb-smp-pbase2', HS(Sp, p2L));
            D.body.style.setProperty('--xysb-smp-text', HS(St, tL));
            var aS = Math.min(Math.max(ss, 0.42), 0.70), aL = dark ? 66 : 46;
            if (ss >= 0.08) D.body.style.setProperty('--xysb-smp-accent', 'hsl(' + h + ',' + Math.round(aS * 100) + '%,' + aL + '%)');
            D.body.setAttribute('data-xysb-auto', dark ? 'dark' : 'light');
        } catch (e) {}
    }
    function _npcDetect() {
        if ((D.body.getAttribute('data-xysb-theme') || 'auto') !== 'auto') return;
        var cache = W.__XYSB_CACHE__ || (W.__XYSB_CACHE__ = {});
        var el = D.querySelector('#bg1') || D.querySelector('#bg_custom') || D.body, bi = '';
        try { bi = W.getComputedStyle(el).backgroundImage || ''; } catch (e) {}
        var um = bi.match(/url\(["']?([^"')]+)["']?\)/);
        if (!um) {
            try { var cs = W.getComputedStyle(D.documentElement); var c = _npcParseRGB(cs.getPropertyValue('--SmartThemeBlurTintColor')) || _npcParseRGB(cs.getPropertyValue('--SmartThemeChatTintColor')); if (c) { _npcApplyRGB(c); return; } } catch (e) {}
            try { D.body.setAttribute('data-xysb-auto', 'light'); } catch (e) {}
            return;
        }
        var url = um[1]; if (cache[url]) { _npcApplyRGB(cache[url]); return; }
        var img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = function () {
            try { var cv = D.createElement('canvas'); cv.width = 32; cv.height = 32; var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 32, 32); var dt = ctx.getImageData(0, 0, 32, 32).data, sr = 0, sg = 0, sb = 0, n = 0; for (var i = 0; i < dt.length; i += 4) { sr += dt[i]; sg += dt[i + 1]; sb += dt[i + 2]; n++; } var c = { r: sr / n, g: sg / n, b: sb / n }; cache[url] = c; _npcApplyRGB(c); } catch (e) {}
        };
        img.src = url;
    }
    function ensureTheme() {
        try { if (!D.body.getAttribute('data-xysb-theme')) { var m = 'auto'; try { m = W.localStorage.getItem('xysb-theme-mode') || 'auto'; } catch (e) {} D.body.setAttribute('data-xysb-theme', m); } } catch (e) {}
        if (typeof W.__XYSB_DETECT__ === 'function') { try { W.__XYSB_DETECT__(); return; } catch (e) {} }
        _npcDetect();
    }
    function cycleTheme() {
        var order = ['auto', 'light', 'dark'], cur = D.body.getAttribute('data-xysb-theme') || 'auto';
        var nxt = order[(order.indexOf(cur) + 1) % order.length];
        D.body.setAttribute('data-xysb-theme', nxt);
        try { W.localStorage.setItem('xysb-theme-mode', nxt); } catch (e) {}
        ensureTheme();
        var msg = nxt === 'auto' ? '主题：自动（吸取背景配色）' : (nxt === 'light' ? '主题：亮色' : '主题：暗色');
        toast(msg);
    }

    // ──────────────── 构建面板 ────────────────
    function clampPanel(p) {
        var r = p.getBoundingClientRect();
        if (r.left < 0) { p.style.left = '4px'; p.style.right = 'auto'; }
        if (r.top < 0) p.style.top = '4px';
        if (r.left > (W.innerWidth || 9999) - 60) { p.style.left = 'auto'; p.style.right = '12px'; }
    }
    function build() {
        injectStyle();
        var oldP = D.getElementById(PFX + '-panel'); if (oldP) oldP.remove();
        var p = D.createElement('div');
        p.id = PFX + '-panel';
        p.innerHTML =
            '<div id="' + PFX + '-head">' +
                '<span id="' + PFX + '-ttl">人 物 档 案</span>' +
                '<span id="' + PFX + '-dot" class="' + PFX + '-dot"></span>' +
                '<span class="sp"></span>' +
                '<span class="' + PFX + '-themebtn" id="' + PFX + '-theme" title="主题：自动(吸取背景配色) / 亮 / 暗 — 点击切换"></span>' +
                '<button class="' + PFX + '-hbtn" id="' + PFX + '-refresh" title="刷新">⟳</button>' +
                '<button class="' + PFX + '-hbtn" id="' + PFX + '-close" title="关闭">✕</button>' +
            '</div>' +
            '<div id="' + PFX + '-tabs">' +
                '<div class="' + PFX + '-tab" data-tab="npc">重要人物<span class="' + PFX + '-num" id="' + PFX + '-cnt-npc">0</span></div>' +
                '<div class="' + PFX + '-tab" data-tab="enemy">在场敌人<span class="' + PFX + '-num" id="' + PFX + '-cnt-enemy">0</span></div>' +
                '<div class="' + PFX + '-tab" data-tab="add">＋新增</div>' +
            '</div>' +
            '<div id="' + PFX + '-search"><input type="text" id="' + PFX + '-q" placeholder="🔎 搜索姓名 / 关系 / 状态…"></div>' +
            '<div id="' + PFX + '-body"></div>' +
            '<div id="' + PFX + '-toast"></div>';
        D.body.appendChild(p);
        try { var pp = JSON.parse(lsGet(LS_PANEL, 'null')); if (pp && pp.left != null) { p.style.left = pp.left + 'px'; p.style.top = pp.top + 'px'; p.style.right = 'auto'; } } catch (e) {}

        D.getElementById(PFX + '-refresh').onclick = function () { paint(); };
        D.getElementById(PFX + '-close').onclick = function () { setOpen(false); };
        var _tb = D.getElementById(PFX + '-theme'); if (_tb) _tb.onclick = function (e) { if (e && e.stopPropagation) e.stopPropagation(); cycleTheme(); };
        var tabs = p.querySelectorAll('.' + PFX + '-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].onclick = function () { setTab(this.getAttribute('data-tab')); };
        var sb = D.getElementById(PFX + '-search');
        D.getElementById(PFX + '-q').oninput = function () { query = this.value.trim(); paint(); };
        makeDraggable(p, D.getElementById(PFX + '-head'), LS_PANEL);

        setTab(activeTab === 'enemy' ? 'enemy' : (activeTab === 'add' ? 'add' : 'npc'));
    }

    function isOpen() { var p = D.getElementById(PFX + '-panel'); return !!(p && p.classList.contains('show')); }
    function setOpen(on) {
        var p = D.getElementById(PFX + '-panel'); if (!p) return;
        p.classList.toggle('show', on);
        lsSet(LS_OPEN, on ? '1' : '0');
        // 搜索框在「新增」页隐藏
        var sb = D.getElementById(PFX + '-search'); if (sb) sb.style.display = (activeTab === 'add') ? 'none' : '';
        if (on) { clampPanel(p); paint(); }
    }
    // 暴露给状态栏 / 工具栏调用的开关
    W.__MVU_NPC_TOGGLE__ = function (force) { setOpen(force === undefined ? !isOpen() : !!force); };

    function makeDraggable(panel, handle, lsKey) {
        var sx, sy, ox, oy, drag = false;
        function start(e) {
            var t = e.target;
            if (t.classList && (t.classList.contains(PFX + '-hbtn') || t.classList.contains(PFX + '-themebtn'))) return;
            var pt = e.touches ? e.touches[0] : e;
            drag = true; sx = pt.clientX; sy = pt.clientY;
            var r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
            panel.style.right = 'auto'; panel.style.left = ox + 'px'; panel.style.top = oy + 'px';
            if (e.cancelable) e.preventDefault();
        }
        function move(e) {
            if (!drag) return;
            var pt = e.touches ? e.touches[0] : e;
            var maxL = (W.innerWidth || 9999) - 44, maxT = (W.innerHeight || 9999) - 44;
            panel.style.left = Math.min(maxL, Math.max(-300, ox + pt.clientX - sx)) + 'px';
            panel.style.top = Math.min(maxT, Math.max(0, oy + pt.clientY - sy)) + 'px';
            if (e.cancelable) e.preventDefault();
        }
        function end() { if (!drag) return; drag = false; var r = panel.getBoundingClientRect(); lsSet(lsKey, JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top) })); }
        handle.addEventListener('mousedown', start);
        handle.addEventListener('touchstart', start, { passive: false });
        D.addEventListener('mousemove', move);
        D.addEventListener('touchmove', move, { passive: false });
        D.addEventListener('mouseup', end);
        D.addEventListener('touchend', end);
    }

    // ──────────────── 事件 + 自愈/自动收起 ────────────────
    var bound = false, listeners = [];
    function bindEvents(M) {
        var on = resolveFn('eventOn');
        if (!on || !M || !M.events) return false;
        function add(ev, fn) { try { on(ev, fn); listeners.push([ev, fn]); } catch (e) {} }
        add(M.events.VARIABLE_UPDATE_ENDED, function () { if (isOpen() && !typing()) paint(); });
        add(M.events.VARIABLE_INITIALIZED, function () { if (isOpen() && !typing()) paint(); });
        bound = true; return true;
    }
    function unbind() { var off = resolveFn('eventRemoveListener') || resolveFn('eventOff'); if (off) listeners.forEach(function (l) { try { off(l[0], l[1]); } catch (e) {} }); listeners = []; }
    function typing() { try { var a = D.activeElement; return !!(a && a.closest && a.closest('#' + PFX + '-panel')); } catch (e) { return false; } }
    function chatClosed() { var chat = D.getElementById('chat'); return !!(chat && !chat.querySelector('.mes')); }

    function start() {
        build();
        ensureTheme(); setTimeout(ensureTheme, 400); setTimeout(ensureTheme, 1500);
        var w = resolveFn('waitGlobalInitialized');
        function afterMvu() { var M = getMvu(); if (M) bindEvents(M); if (isOpen()) paint(); }
        if (w) { Promise.resolve(w('Mvu')).then(afterMvu).catch(afterMvu); } else { setTimeout(afterMvu, 300); }

        var lastSig = '';
        var poll = W.setInterval(function () {
            ensureTheme();
            if (!bound) { var M = getMvu(); if (M) bindEvents(M); }
            // 聊天关闭 → 自动收起（无需刷新页面）
            if (isOpen() && chatClosed()) { setOpen(false); return; }
            if (typing()) return;
            var S = readStat();
            var sig = S ? JSON.stringify([S.重要人物 || {}, S.在场敌人 || {}]) : '';
            if (sig !== lastSig) { lastSig = sig; if (isOpen()) paint(); }
        }, 2500);

        // 本次若由「工具栏按钮再次运行」触发 → 直接打开；首次加载则保持上次状态(默认关)
        if (wasLoaded) setOpen(true);
        else setOpen(lsGet(LS_OPEN, '0') === '1' && !chatClosed());

        W.__MVU_NPC_CLEANUP__ = function () {
            try { unbind(); } catch (e) {}
            try { W.clearInterval(poll); } catch (e) {}
            try { var p = D.getElementById(PFX + '-panel'); if (p) p.remove(); } catch (e) {}
            try { var s = D.getElementById(PFX + '-style'); if (s) s.remove(); } catch (e) {}
            try { if (W.__MVU_NPC_TOGGLE__) W.__MVU_NPC_TOGGLE__ = null; } catch (e) {}
            W.__MVU_NPC_CLEANUP__ = null;
        };
    }

    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
    else start();
})();
