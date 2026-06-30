(function () {
    'use strict';
    // ════════════════════════════════════════════════════════════════
    //  MVU 变量监控器 · Variable Monitor
    //  实时查看 MVU(MagVarUpdate) 的 stat_data / display_data 变量树，
    //  并记录每轮 AI 的 _.set / insert / delete 更新命令，便于调试卡片。
    //  数据源：window.Mvu + TavernHelper.getVariables
    // ════════════════════════════════════════════════════════════════

    // ── 解析父窗口（把面板挂到酒馆主页面，跨楼层常驻）──
    var W;
    try { W = (window.parent && window.parent.document) ? window.parent : window; } catch (e) { W = window; }
    var D = W.document;

    // 清理上一实例（脚本重载时）
    var wasLoaded = false;
    try { wasLoaded = (typeof W.__MVU_MON_CLEANUP__ === 'function'); } catch (e) {}
    try { if (W.__MVU_MON_CLEANUP__) W.__MVU_MON_CLEANUP__(); } catch (e) {}

    var PFX = 'mvumon';
    var LOG = [];           // 更新日志（最新在前）
    var LOG_MAX = 200;
    var collapsed = false;
    var activeTab = 'tree'; // 'tree' | 'log'
    var query = '';
    var openPaths = {};     // 记录展开的节点路径
    var lastStat = null;
    function lsGet(k, d) { try { var v = W.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function lsSet(k, v) { try { W.localStorage.setItem(k, v); } catch (e) {} }

    // ──────────────── 工具：解析全局函数（脚本/iframe 多来源兜底）────────────────
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
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function latestId() {
        var f = resolveFn('getLastMessageId');
        if (f) { try { var v = f(); if (typeof v === 'number') return v; } catch (e) {} }
        return -1;
    }

    // ──────────────── 数据层：读取当前变量 ────────────────
    function readVars() {
        var id = latestId();
        // 1) MVU 自带 API —— 最权威，反映"已应用"的更新（教程推荐）
        var M = getMvu();
        if (M && typeof M.getMvuData === 'function') {
            try { var d = M.getMvuData({ type: 'message', message_id: 'latest' }); if (d && d.stat_data) return { stat: d.stat_data, display: d.display_data || null, src: 'Mvu·msg#' + id }; } catch (e) {}
            try { var dc = M.getMvuData({ type: 'chat' }); if (dc && dc.stat_data) return { stat: dc.stat_data, display: dc.display_data || null, src: 'Mvu·chat' }; } catch (e) {}
        }
        // 2) 直接读消息 data（MVU 教程的读法：getChatMessages(id)[0].data）
        var gcm = resolveFn('getChatMessages');
        if (gcm) {
            try { var arr = gcm(id); if (arr && arr[0] && arr[0].data && (arr[0].data.stat_data || arr[0].data.display_data)) { var gd = arr[0].data; return { stat: gd.stat_data, display: gd.display_data, src: 'msg.data#' + id }; } } catch (e) {}
        }
        // 3) getVariables 兜底（注意：可能返回更新前快照）
        var gv = resolveFn('getVariables');
        if (gv) {
            try { var v = gv({ type: 'message', message_id: id }); if (v && (v.stat_data || v.display_data)) return { stat: v.stat_data, display: v.display_data, src: 'getVar·msg#' + id }; } catch (e) {}
            try { var v2 = gv({ type: 'chat' }); if (v2 && (v2.stat_data || v2.display_data)) return { stat: v2.stat_data, display: v2.display_data, src: 'getVar·chat' }; } catch (e) {}
        }
        return { stat: null, display: null, src: '(无数据)' };
    }

    // 判断是否为 MVU 的 [值, "说明"] 叶子对
    function isLeafPair(v) {
        return Array.isArray(v) && v.length === 2 && (typeof v[1] === 'string') &&
            (typeof v[0] !== 'object' || v[0] === null);
    }

    // ──────────────── 渲染：变量树 ────────────────
    function valSpan(val) {
        var t = typeof val, cls = 'v-str';
        if (t === 'number') cls = 'v-num';
        else if (t === 'boolean') cls = 'v-bool';
        else if (val === null || val === '') { cls = 'v-null'; val = (val === '' ? '(空)' : 'null'); }
        return '<span class="' + PFX + '-' + cls + '">' + esc(val) + '</span>';
    }
    function matchQ(path, val) {
        if (!query) return true;
        var hay = (path + ' ' + JSON.stringify(val)).toLowerCase();
        return hay.indexOf(query.toLowerCase()) !== -1;
    }
    function renderNode(key, val, path) {
        var here = path ? (path + '.' + key) : key;
        // 叶子：MVU 对 [值,"说明"]
        if (isLeafPair(val)) {
            if (!matchQ(here, val[0])) return '';
            var desc = val[1] ? '<span class="' + PFX + '-desc" title="' + esc(val[1]) + '">ⓘ</span>' : '';
            return '<div class="' + PFX + '-leaf"><span class="' + PFX + '-k">' + esc(key) + '</span>'
                + '<span class="' + PFX + '-eq">:</span> ' + valSpan(val[0]) + ' ' + desc + '</div>';
        }
        // 纯标量
        if (typeof val !== 'object' || val === null) {
            if (!matchQ(here, val)) return '';
            return '<div class="' + PFX + '-leaf"><span class="' + PFX + '-k">' + esc(key) + '</span>'
                + '<span class="' + PFX + '-eq">:</span> ' + valSpan(val) + '</div>';
        }
        // 数组（非叶子对）
        if (Array.isArray(val)) {
            if (!val.length) {
                if (!matchQ(here, '')) return '';
                return '<div class="' + PFX + '-leaf"><span class="' + PFX + '-k">' + esc(key) + '</span>'
                    + '<span class="' + PFX + '-eq">:</span> <span class="' + PFX + '-v-null">[空]</span></div>';
            }
            var inner = '';
            for (var i = 0; i < val.length; i++) inner += renderNode('[' + i + ']', val[i], here);
            if (!inner && query) return '';
            return branch(key, here, '[' + val.length + ']', inner);
        }
        // 对象
        var ks = Object.keys(val);
        if (!ks.length) {
            if (!matchQ(here, '')) return '';
            return '<div class="' + PFX + '-leaf"><span class="' + PFX + '-k">' + esc(key) + '</span>'
                + '<span class="' + PFX + '-eq">:</span> <span class="' + PFX + '-v-null">{空}</span></div>';
        }
        var body = '';
        for (var j = 0; j < ks.length; j++) body += renderNode(ks[j], val[ks[j]], here);
        if (!body && query) return '';
        return branch(key, here, '{' + ks.length + '}', body);
    }
    function branch(key, here, count, inner) {
        var open = query ? true : (openPaths[here] !== false && (openPaths[here] === true || depthOf(here) <= 1));
        return '<div class="' + PFX + '-branch">'
            + '<div class="' + PFX + '-bhead" data-path="' + esc(here) + '">'
            + '<span class="' + PFX + '-arrow">' + (open ? '▾' : '▸') + '</span>'
            + '<span class="' + PFX + '-k">' + esc(key) + '</span>'
            + '<span class="' + PFX + '-count">' + count + '</span></div>'
            + '<div class="' + PFX + '-bbody" style="display:' + (open ? 'block' : 'none') + '">' + inner + '</div></div>';
    }
    function depthOf(p) { return (p.match(/\./g) || []).length; }

    function renderTree() {
        var r = readVars();
        lastStat = r.stat;
        var srcEl = D.getElementById(PFX + '-src');
        if (srcEl) srcEl.textContent = '数据源: ' + r.src;
        if (!r.stat) {
            return '<div class="' + PFX + '-empty">尚未读到 stat_data。<br>请确认：①已启用 MVU 脚本 ②世界书含 [InitVar] 条目 ③已发出至少一条消息完成初始化。</div>';
        }
        var ks = Object.keys(r.stat);
        if (!ks.length) return '<div class="' + PFX + '-empty">stat_data 为空。</div>';
        var html = '';
        for (var i = 0; i < ks.length; i++) html += renderNode(ks[i], r.stat[ks[i]], '');
        return html || '<div class="' + PFX + '-empty">无匹配「' + esc(query) + '」的变量。</div>';
    }

    // ──────────────── 渲染：更新日志 ────────────────
    function pushLog(entry) {
        entry.t = new Date();
        LOG.unshift(entry);
        if (LOG.length > LOG_MAX) LOG.length = LOG_MAX;
        if (activeTab === 'log') paintBody();
        flashDot();
    }
    function fmtTime(d) {
        function p(n) { return n < 10 ? '0' + n : '' + n; }
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }
    function cmdLine(c) {
        var type = c.type || 'set';
        var a = c.args || [];
        var reason = c.reason ? '<span class="' + PFX + '-reason">// ' + esc(c.reason) + '</span>' : '';
        if (type === 'set') {
            var path = a[0], oldv, newv;
            if (a.length >= 3) { oldv = a[1]; newv = a[2]; } else { oldv = '—'; newv = a[1]; }
            return '<div class="' + PFX + '-cmd"><span class="' + PFX + '-badge b-set">SET</span> '
                + '<span class="' + PFX + '-cpath">' + esc(path) + '</span> '
                + '<span class="' + PFX + '-old">' + esc(oldv) + '</span> → '
                + '<span class="' + PFX + '-new">' + esc(newv) + '</span> ' + reason + '</div>';
        }
        var label = type.toUpperCase(), bcls = 'b-' + type;
        return '<div class="' + PFX + '-cmd"><span class="' + PFX + '-badge ' + bcls + '">' + esc(label) + '</span> '
            + '<span class="' + PFX + '-cpath">' + esc(a[0]) + '</span> '
            + (a.length > 1 ? '<span class="' + PFX + '-new">' + esc(a.slice(1).join(', ')) + '</span> ' : '') + reason + '</div>';
    }
    function renderLog() {
        if (!LOG.length) return '<div class="' + PFX + '-empty">暂无更新记录。<br>当 AI 回复中包含 &lt;UpdateVariable&gt; 命令时，这里会逐条显示。</div>';
        var html = '';
        for (var i = 0; i < LOG.length; i++) {
            var e = LOG[i];
            var cmds = (e.commands || []).map(cmdLine).join('');
            html += '<div class="' + PFX + '-logitem"><div class="' + PFX + '-logtime">⏱ ' + fmtTime(e.t)
                + (e.note ? ' · ' + esc(e.note) : '') + '</div>' + (cmds || '<div class="' + PFX + '-cmd ' + PFX + '-dim">（本轮无变量变更）</div>') + '</div>';
        }
        return html;
    }

    // ──────────────── 面板骨架 ────────────────
    function paintBody() {
        var body = D.getElementById(PFX + '-body');
        if (!body) return;
        body.innerHTML = activeTab === 'tree' ? renderTree() : renderLog();
        if (activeTab === 'tree') wireTree();
    }
    function wireTree() {
        var heads = D.querySelectorAll('#' + PFX + '-body .' + PFX + '-bhead');
        for (var i = 0; i < heads.length; i++) {
            heads[i].onclick = function () {
                var p = this.getAttribute('data-path');
                var bodyEl = this.nextSibling;
                var nowOpen = bodyEl.style.display === 'none';
                bodyEl.style.display = nowOpen ? 'block' : 'none';
                this.querySelector('.' + PFX + '-arrow').textContent = nowOpen ? '▾' : '▸';
                openPaths[p] = nowOpen;
            };
        }
    }
    function setTab(t) {
        activeTab = t;
        var tabs = D.querySelectorAll('#' + PFX + '-panel .' + PFX + '-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === t);
        paintBody();
    }
    function flashDot() {
        var dot = D.getElementById(PFX + '-dot');
        if (!dot) return;
        dot.classList.add('flash');
        setTimeout(function () { dot.classList.remove('flash'); }, 600);
    }
    function setStatus(level, text) {
        var dot = D.getElementById(PFX + '-dot');
        if (dot) { dot.className = PFX + '-dot lvl-' + level; dot.title = text; }
    }

    // ──────────────── 样式 ────────────────
    function injectStyle() {
        if (D.getElementById(PFX + '-style')) return;
        var css = '' +
        '#' + PFX + '-panel{position:fixed;top:64px;right:18px;width:340px;max-width:92vw;z-index:99999;' +
        'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#e8e6f5;background:rgba(28,24,46,.97);' +
        'border:1px solid rgba(155,135,225,.45);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.5);overflow:hidden;backdrop-filter:blur(6px)}' +
        '#' + PFX + '-head{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:move;user-select:none;' +
        'background:linear-gradient(135deg,rgba(120,95,200,.55),rgba(80,60,150,.4));border-bottom:1px solid rgba(155,135,225,.3)}' +
        '#' + PFX + '-title{font-weight:700;font-size:12.5px;letter-spacing:.3px;flex:0 0 auto}' +
        '.' + PFX + '-dot{width:9px;height:9px;border-radius:50%;background:#888;flex:0 0 auto;transition:.3s;box-shadow:0 0 0 0 rgba(130,220,150,.6)}' +
        '.' + PFX + '-dot.lvl-ok{background:#5fd38a}.' + PFX + '-dot.lvl-warn{background:#e8c45a}.' + PFX + '-dot.lvl-err{background:#e0707a}' +
        '.' + PFX + '-dot.flash{animation:' + PFX + '-pulse .6s}' +
        '@keyframes ' + PFX + '-pulse{0%{box-shadow:0 0 0 0 rgba(130,220,150,.7)}100%{box-shadow:0 0 0 10px rgba(130,220,150,0)}}' +
        '#' + PFX + '-head .sp{flex:1 1 auto}' +
        '.' + PFX + '-btn{cursor:pointer;border:none;background:rgba(255,255,255,.08);color:#e8e6f5;border-radius:6px;' +
        'padding:2px 7px;font-size:12px;transition:.15s}.' + PFX + '-btn:hover{background:rgba(255,255,255,.2)}' +
        '#' + PFX + '-tabs{display:flex;gap:0;border-bottom:1px solid rgba(155,135,225,.25);background:rgba(0,0,0,.15)}' +
        '.' + PFX + '-tab{flex:1;text-align:center;padding:6px 0;cursor:pointer;color:#b9b2d8;font-size:11.5px;border-bottom:2px solid transparent}' +
        '.' + PFX + '-tab.active{color:#fff;border-bottom-color:#b79aff;background:rgba(155,135,225,.12)}' +
        '#' + PFX + '-search{padding:6px 8px;border-bottom:1px solid rgba(155,135,225,.2)}' +
        '#' + PFX + '-search input{width:100%;box-sizing:border-box;background:rgba(0,0,0,.3);border:1px solid rgba(155,135,225,.3);' +
        'color:#e8e6f5;border-radius:6px;padding:4px 8px;font:inherit;outline:none}' +
        '#' + PFX + '-body{max-height:52vh;overflow:auto;padding:6px 8px 10px}' +
        '#' + PFX + '-foot{display:flex;align-items:center;gap:8px;padding:5px 9px;font-size:10.5px;color:#9b94bd;border-top:1px solid rgba(155,135,225,.2);background:rgba(0,0,0,.18)}' +
        '.' + PFX + '-leaf{padding:1px 0 1px 14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.' + PFX + '-branch{padding-left:6px}' +
        '.' + PFX + '-bhead{cursor:pointer;padding:1px 0;display:flex;align-items:center;gap:4px}' +
        '.' + PFX + '-bhead:hover{background:rgba(155,135,225,.1);border-radius:4px}' +
        '.' + PFX + '-bbody{padding-left:10px;border-left:1px dotted rgba(155,135,225,.28);margin-left:5px}' +
        '.' + PFX + '-arrow{width:10px;color:#b79aff;font-size:10px}' +
        '.' + PFX + '-k{color:#c7bcf0}.' + PFX + '-eq{color:#7d75a0}.' + PFX + '-count{color:#7d75a0;font-size:10px;margin-left:4px}' +
        '.' + PFX + '-v-str{color:#9be3c8}.' + PFX + '-v-num{color:#ffd479}.' + PFX + '-v-bool{color:#ff9ecb}.' + PFX + '-v-null{color:#6f6890;font-style:italic}' +
        '.' + PFX + '-desc{color:#8a82ad;cursor:help;font-size:10px;margin-left:2px}' +
        '.' + PFX + '-empty{color:#9b94bd;padding:18px 10px;text-align:center;line-height:1.7}' +
        '.' + PFX + '-logitem{border-bottom:1px solid rgba(155,135,225,.15);padding:5px 2px}' +
        '.' + PFX + '-logtime{color:#8a82ad;font-size:10px;margin-bottom:2px}' +
        '.' + PFX + '-cmd{padding:1px 0 1px 4px;white-space:normal;word-break:break-word}' +
        '.' + PFX + '-dim{color:#7d75a0}' +
        '.' + PFX + '-badge{display:inline-block;font-size:9px;font-weight:700;border-radius:4px;padding:1px 4px;margin-right:4px;color:#1a1530}' +
        '.b-set{background:#7fd3a0}.b-insert{background:#86bff0}.b-delete{background:#e0707a}.b-add{background:#e8c45a}.b-move{background:#c7a0f0}' +
        '.' + PFX + '-cpath{color:#c7bcf0}.' + PFX + '-old{color:#cf8a8a;text-decoration:line-through;opacity:.8}.' + PFX + '-new{color:#9be3c8}' +
        '.' + PFX + '-reason{color:#8a82ad;font-style:italic;margin-left:4px}' +
        '#' + PFX + '-panel.collapsed #' + PFX + '-tabs,#' + PFX + '-panel.collapsed #' + PFX + '-search,#' + PFX + '-panel.collapsed #' + PFX + '-body,#' + PFX + '-panel.collapsed #' + PFX + '-foot{display:none}' +
        '#' + PFX + '-launch{position:fixed;z-index:99998;width:54px;height:54px;border-radius:50%;cursor:grab;touch-action:none;' +
        'right:max(12px,env(safe-area-inset-right));top:42%;display:flex;align-items:center;justify-content:center;font-size:23px;color:#fff;' +
        'background:radial-gradient(circle at 32% 28%,#9a78e0,#6a4bb0 70%);border:1px solid rgba(199,180,255,.55);' +
        'box-shadow:0 6px 18px rgba(60,40,110,.5);-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .15s,box-shadow .25s}' +
        '#' + PFX + '-launch:hover{transform:scale(1.07);box-shadow:0 8px 22px rgba(60,40,110,.6)}' +
        '#' + PFX + '-launch:active{cursor:grabbing}#' + PFX + '-launch.dragging{transition:none}' +
        '@media (max-width:480px){#' + PFX + '-launch{width:50px;height:50px;font-size:21px}}';
        var st = D.createElement('style');
        st.id = PFX + '-style';
        st.textContent = css;
        D.head.appendChild(st);
    }

    // ──────────────── 构建面板 ────────────────
    function build() {
        injectStyle();
        var old = D.getElementById(PFX + '-panel'); if (old) old.remove();
        var p = D.createElement('div');
        p.id = PFX + '-panel';
        p.innerHTML =
            '<div id="' + PFX + '-head">' +
                '<span id="' + PFX + '-title">🔮 MVU 变量监控器</span>' +
                '<span id="' + PFX + '-dot" class="' + PFX + '-dot"></span>' +
                '<span class="sp"></span>' +
                '<button class="' + PFX + '-btn" id="' + PFX + '-refresh" title="刷新">⟳</button>' +
                '<button class="' + PFX + '-btn" id="' + PFX + '-copy" title="复制 stat_data JSON">⧉</button>' +
                '<button class="' + PFX + '-btn" id="' + PFX + '-min" title="折叠">—</button>' +
                '<button class="' + PFX + '-btn" id="' + PFX + '-close" title="关闭（点右下角圆钮可重开）">✕</button>' +
            '</div>' +
            '<div id="' + PFX + '-tabs">' +
                '<div class="' + PFX + '-tab active" data-tab="tree">变量树</div>' +
                '<div class="' + PFX + '-tab" data-tab="log">更新日志</div>' +
            '</div>' +
            '<div id="' + PFX + '-search"><input type="text" placeholder="🔎 过滤路径 / 值…" id="' + PFX + '-q"></div>' +
            '<div id="' + PFX + '-body"></div>' +
            '<div id="' + PFX + '-foot"><span id="' + PFX + '-src">数据源: —</span><span class="sp" style="flex:1"></span><span id="' + PFX + '-mvuver"></span></div>';
        D.body.appendChild(p);

        // 事件绑定
        D.getElementById(PFX + '-refresh').onclick = function () { paintBody(); };
        D.getElementById(PFX + '-copy').onclick = function () { copyJson(); };
        D.getElementById(PFX + '-min').onclick = function () {
            collapsed = !collapsed; p.classList.toggle('collapsed', collapsed);
            this.textContent = collapsed ? '▢' : '—';
        };
        D.getElementById(PFX + '-close').onclick = function () { setPanelOpen(false); };
        var tabs = D.querySelectorAll('#' + PFX + '-tabs .' + PFX + '-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].onclick = function () { setTab(this.getAttribute('data-tab')); };
        var q = D.getElementById(PFX + '-q');
        q.oninput = function () { query = this.value.trim(); if (activeTab !== 'tree') setTab('tree'); else paintBody(); };

        makeDraggable(p, D.getElementById(PFX + '-head'));
        paintBody();
        // 开关改由「状态栏顶部按钮 / 工具栏按钮」驱动，不再用悬浮球
        W.__MVU_MON_TOGGLE__ = function (force) {
            var p = D.getElementById(PFX + '-panel'); if (!p) return;
            setPanelOpen(force === undefined ? (p.style.display === 'none') : !!force);
        };
        if (wasLoaded) setPanelOpen(true);                                  // 工具栏再次点击 → 打开
        else setPanelOpen(lsGet(PFX + ':open', '0') === '1' && !chatClosed()); // 首次加载：默认关，按上次状态
    }
    function chatClosed() { var chat = D.getElementById('chat'); return !!(chat && !chat.querySelector('.mes')); }
    function setPanelOpen(on) {
        var p = D.getElementById(PFX + '-panel');
        if (!p) return;
        p.style.display = on ? 'block' : 'none';
        lsSet(PFX + ':open', on ? '1' : '0');
        if (on) {
            // 重开时若面板被拖出视口外，拉回可见区
            var r = p.getBoundingClientRect();
            if (r.left < 0 || r.left > (W.innerWidth || 9999) - 40) { p.style.left = 'auto'; p.style.right = '18px'; }
            if (r.top < 0) p.style.top = '64px';
            paintBody();
        }
    }
    function ensureBall() {
        if (D.getElementById(PFX + '-launch')) return;
        var b = D.createElement('div');
        b.id = PFX + '-launch'; b.textContent = '🔮'; b.title = 'MVU 变量监控器（拖动移动 · 点按开关）';
        D.body.appendChild(b);
        // 恢复上次位置
        try { var bp = JSON.parse(lsGet(PFX + ':ball', 'null')); if (bp && bp.left != null) { b.style.left = bp.left + 'px'; b.style.top = bp.top + 'px'; b.style.right = 'auto'; } } catch (e) {}
        var moved = false, sx, sy, ox, oy, dragging = false;
        function down(e) {
            dragging = true; moved = false; b.classList.add('dragging');
            var pt = e.touches ? e.touches[0] : e;
            sx = pt.clientX; sy = pt.clientY;
            var r = b.getBoundingClientRect(); ox = r.left; oy = r.top; b.style.right = 'auto';
        }
        function move(e) {
            if (!dragging) return;
            var pt = e.touches ? e.touches[0] : e;
            var dx = pt.clientX - sx, dy = pt.clientY - sy;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
            b.style.left = (ox + dx) + 'px'; b.style.top = (oy + dy) + 'px';
            if (e.cancelable) e.preventDefault();
        }
        function up() {
            if (!dragging) return;
            dragging = false; b.classList.remove('dragging');
            var r = b.getBoundingClientRect();
            var maxL = (W.innerWidth || 360) - r.width - 6, maxT = (W.innerHeight || 640) - r.height - 6;
            var L = Math.min(maxL, Math.max(6, r.left)), T = Math.min(maxT, Math.max(6, r.top));
            b.style.left = L + 'px'; b.style.top = T + 'px';
            lsSet(PFX + ':ball', JSON.stringify({ left: Math.round(L), top: Math.round(T) }));
        }
        b.addEventListener('mousedown', down);
        b.addEventListener('touchstart', down, { passive: true });
        D.addEventListener('mousemove', move);
        D.addEventListener('touchmove', move, { passive: false });
        D.addEventListener('mouseup', up);
        D.addEventListener('touchend', up);
        b.addEventListener('click', function () {
            if (moved) { moved = false; return; }   // 拖动后不误触发
            var p = D.getElementById(PFX + '-panel');
            setPanelOpen(!(p && p.style.display !== 'none'));
        });
    }
    function copyJson() {
        var txt = lastStat ? JSON.stringify(lastStat, null, 2) : '';
        try { (W.navigator.clipboard || navigator.clipboard).writeText(txt); flashCopy('已复制'); }
        catch (e) { flashCopy('复制失败'); }
    }
    function flashCopy(msg) {
        var b = D.getElementById(PFX + '-copy'); if (!b) return;
        var o = b.textContent; b.textContent = '✓'; b.title = msg;
        setTimeout(function () { b.textContent = o; b.title = '复制 stat_data JSON'; }, 900);
    }
    function makeDraggable(panel, handle) {
        var sx, sy, ox, oy, drag = false;
        function start(e) {
            var t = e.target;
            if (t.classList && t.classList.contains(PFX + '-btn')) return;
            var pt = e.touches ? e.touches[0] : e;
            drag = true; sx = pt.clientX; sy = pt.clientY;
            var r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
            panel.style.right = 'auto'; panel.style.left = ox + 'px'; panel.style.top = oy + 'px';
            if (e.cancelable) e.preventDefault();
        }
        function move(e) {
            if (!drag) return;
            var pt = e.touches ? e.touches[0] : e;
            var maxL = (W.innerWidth || 9999) - 40, maxT = (W.innerHeight || 9999) - 40;
            panel.style.left = Math.min(maxL, Math.max(-280, ox + pt.clientX - sx)) + 'px';
            panel.style.top = Math.min(maxT, Math.max(0, oy + pt.clientY - sy)) + 'px';
            if (e.cancelable) e.preventDefault();
        }
        function end() { drag = false; }
        handle.addEventListener('mousedown', start);
        handle.addEventListener('touchstart', start, { passive: false });
        D.addEventListener('mousemove', move);
        D.addEventListener('touchmove', move, { passive: false });
        D.addEventListener('mouseup', end);
        D.addEventListener('touchend', end);
    }

    // ──────────────── 事件接入（MVU 实时刷新 + 记日志）────────────────
    var bound = false, listeners = [];
    function bindEvents(M) {
        var on = resolveFn('eventOn');
        if (!on || !M || !M.events) return false;
        var E = M.events;
        function add(ev, fn) { try { on(ev, fn); listeners.push([ev, fn]); } catch (e) {} }
        add(E.COMMAND_PARSED, function (variables, commands, message_content) {
            // 记录本轮解析出的所有命令；若为 0 条，自诊断到底卡在哪一步
            var cmds = (commands || []).slice();
            var note = '解析命令';
            if (!cmds.length) {
                var mc = String(message_content || '');
                var hasBlock = /<UpdateVariable>/i.test(mc);
                var hasSet = /_\.\s*set\s*\(/i.test(mc);
                if (!hasBlock && !hasSet) note = '⚠ 0命令：AI没写 <UpdateVariable> 块';
                else if (hasBlock && !hasSet) note = '⚠ 0命令：有块、但没写 _.set 命令行';
                else if (!hasBlock && hasSet) note = '⚠ 0命令：有_.set、但没包进<UpdateVariable>';
                else note = '⚠ 0命令：有命令但没被解析(格式异常?)';
            }
            pushLog({ commands: cmds, note: note });
        });
        add(E.VARIABLE_UPDATE_ENDED, function (variables, before) {
            paintBody();
            setStatus('ok', 'MVU 已就绪，变量已更新');
        });
        add(E.VARIABLE_INITIALIZED, function () {
            paintBody();
            pushLog({ commands: [], note: '变量已初始化' });
        });
        bound = true;
        return true;
    }
    function unbind() {
        var off = resolveFn('eventRemoveListener') || resolveFn('eventOff');
        if (off) listeners.forEach(function (l) { try { off(l[0], l[1]); } catch (e) {} });
        listeners = [];
    }

    // ──────────────── 启动 ────────────────
    function start() {
        build();
        setStatus('warn', '等待 MVU 初始化…');
        var w = resolveFn('waitGlobalInitialized');
        function afterMvu() {
            var M = getMvu();
            if (M) {
                bindEvents(M);
                setStatus('ok', 'MVU 已就绪');
                var ver = D.getElementById(PFX + '-mvuver');
                if (ver) ver.textContent = 'MVU ✓';
            } else {
                // MVU 不可用：仍能只读展示变量（若存在），降级
                var r = readVars();
                setStatus(r.stat ? 'warn' : 'err', r.stat ? '仅只读：未检测到 MVU 接口' : '未检测到 MVU 或变量');
            }
            paintBody();
        }
        if (w) { Promise.resolve(w('Mvu')).then(afterMvu).catch(afterMvu); }
        else { setTimeout(afterMvu, 300); }

        // 兜底轮询：若 MVU 事件未绑上，定期刷新数据源/状态；并在聊天关闭时自动收起面板
        var poll = W.setInterval(function () {
            if (!bound) {
                var M = getMvu();
                if (M) { bindEvents(M); setStatus('ok', 'MVU 已就绪'); var ver = D.getElementById(PFX + '-mvuver'); if (ver) ver.textContent = 'MVU ✓'; }
            }
            var p = D.getElementById(PFX + '-panel');
            if (p && p.style.display !== 'none' && chatClosed()) { setPanelOpen(false); return; }
            if (activeTab === 'tree' && !query) paintBody();
        }, 4000);

        // 清理钩子
        W.__MVU_MON_CLEANUP__ = function () {
            try { unbind(); } catch (e) {}
            try { W.clearInterval(poll); } catch (e) {}
            try { var p = D.getElementById(PFX + '-panel'); if (p) p.remove(); } catch (e) {}
            try { var l = D.getElementById(PFX + '-launch'); if (l) l.remove(); } catch (e) {}
            try { var s = D.getElementById(PFX + '-style'); if (s) s.remove(); } catch (e) {}
            try { if (W.__MVU_MON_TOGGLE__) W.__MVU_MON_TOGGLE__ = null; } catch (e) {}
            W.__MVU_MON_CLEANUP__ = null;
        };
    }

    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
    else start();
})();
