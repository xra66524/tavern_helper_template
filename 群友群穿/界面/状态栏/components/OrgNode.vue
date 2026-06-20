<template>
  <li :class="['tree-node', { flash }]" :data-org-node="名">
    <div :class="['node-row', { 'is-top': isTop }]">
      <span class="node-status-dot" :class="{ revoked: isRevoked }" :style="{ background: statusColor }" />
      <template v-if="renaming">
        <input v-model="newName" class="rename-input" @blur="commitRename" @keyup.enter="commitRename" />
      </template>
      <template v-else>
        <span :class="['node-name', { 'is-top': isTop, revoked: isRevoked }]" :title="isTop ? '当前最高权力机构' : ''">
          {{ 名 }}
        </span>
      </template>
      <span v-if="!editing" class="node-type">{{ node.类型 || '—' }}</span>
      <select
        v-else
        :value="node.类型"
        class="form-select form-select--sm"
        @click.stop
        @change="setNode('类型', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>类型…</option>
        <option v-for="opt in 类型选项" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <template v-if="!editing">
        <span class="node-status" :style="{ color: statusColor }">{{ node.运作状态 || '—' }}</span>
      </template>
      <template v-else>
        <div class="edit-combo edit-combo--inline" @click.stop>
          <select
            :value="node.运作状态"
            class="form-select form-select--sm"
            @change="setNode('运作状态', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>状态…</option>
            <option v-for="opt in 运作状态选项" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input
            v-model="运作状态自定义"
            type="text"
            class="form-input form-input--xs"
            placeholder="或自定义…"
            @input="onStatusCustom"
          />
        </div>
      </template>

      <button v-if="!editing" type="button" class="icon-btn" title="制度详情" @click="emit('open-detail', 名)">
        ⚙
      </button>
      <button v-if="editing" type="button" class="icon-btn" title="重命名" @click="startRename">✎</button>
      <button v-if="editing" type="button" class="icon-btn" title="添加子机构" @click="emit('add-child', 名)">
        ＋
      </button>
      <button
        v-if="editing"
        type="button"
        class="icon-btn icon-btn--danger"
        title="删除（含子孙）"
        @click="emit('remove', 名)"
      >
        ✕
      </button>
      <button
        v-if="hasChildren"
        type="button"
        class="icon-btn collapse-btn"
        :title="collapsed ? '展开' : '折叠'"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '▸' : '▾' }}
      </button>
    </div>

    <!-- 路径面包屑：沿 上级机构 链上溯，折叠时也能看到归属 -->
    <div v-if="ancestors.length > 0" class="path-row">
      <span class="path-label">📎</span>
      <template v-for="(anc, idx) in ancestors" :key="anc">
        <button type="button" class="path-chip" :title="`跳转至 ${anc}`" @click="emit('jump', anc)">{{ anc }}</button>
        <span v-if="idx < ancestors.length - 1" class="path-sep">›</span>
      </template>
      <span class="path-sep">›</span>
      <span class="path-current">{{ 名 }}</span>
    </div>

    <div class="node-meta">
      <template v-if="!editing">
        <span>一把手：{{ node.一把手 || '空缺' }}</span>
        <span>二把手：{{ node.二把手 || '无' }}</span>
        <span class="power-cell">
          权势：
          <span class="power-bar" :title="`权势指数 ${node.权势指数 ?? 0}/100`">
            <span class="power-fill" :style="{ width: `${powerPercent}%`, background: powerColor }"></span>
          </span>
          <strong :style="{ color: powerColor }">{{ node.权势指数 ?? 0 }}</strong>
        </span>
        <span>当前人数：{{ node.实有人数 ?? 0 }}</span>
        <span v-if="node.当前任务" class="node-task">任务：{{ node.当前任务 }}</span>
        <span v-if="副职显示.length > 0" class="node-array-chip">副职：{{ 副职显示.join('、') }}</span>
        <span v-if="成员显示.length > 0" class="node-array-chip">班子成员：{{ 成员显示.join('、') }}</span>
      </template>
      <template v-else>
        <label class="edit-field edit-field--inline">
          <span class="edit-label">一把手</span>
          <input
            :value="node.一把手"
            type="text"
            class="form-input form-input--xs"
            placeholder="空缺"
            @change="setNode('一把手', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="edit-field edit-field--inline">
          <span class="edit-label">二把手</span>
          <input
            :value="node.二把手"
            type="text"
            class="form-input form-input--xs"
            placeholder="无"
            @change="setNode('二把手', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="edit-field edit-field--inline">
          <span class="edit-label">权势</span>
          <input
            :value="node.权势指数"
            type="number"
            min="0"
            max="100"
            class="form-input form-input--num"
            @change="setNode('权势指数', Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <label class="edit-field edit-field--inline">
          <span class="edit-label">当前人数</span>
          <input
            :value="node.实有人数"
            type="number"
            min="0"
            class="form-input form-input--num"
            @change="setNode('实有人数', Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <label class="edit-field edit-field--wide">
          <span class="edit-label">当前任务</span>
          <input
            :value="node.当前任务"
            type="text"
            class="form-input"
            placeholder="输入任务…"
            @change="setNode('当前任务', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <div class="edit-field edit-field--wide">
          <span class="edit-label">副职</span>
          <div class="edit-chips">
            <span v-for="(v, i) in 副职显示" :key="i" class="edit-chip">
              {{ v }}
              <button
                type="button"
                class="chip-remove"
                @click="
                  副职显示.splice(i, 1);
                  sync副职();
                "
              >
                ✕
              </button>
            </span>
            <input v-model="副职输入" type="text" class="chip-input" placeholder="添加…" @keyup.enter="add副职" />
            <button type="button" class="chip-add-btn" :disabled="!副职输入.trim()" @click="add副职">＋</button>
          </div>
        </div>
        <div class="edit-field edit-field--wide">
          <span class="edit-label">班子成员</span>
          <div class="edit-chips">
            <span v-for="(v, i) in 成员显示" :key="i" class="edit-chip">
              {{ v }}
              <button
                type="button"
                class="chip-remove"
                @click="
                  成员显示.splice(i, 1);
                  sync成员();
                "
              >
                ✕
              </button>
            </span>
            <input v-model="成员输入" type="text" class="chip-input" placeholder="添加…" @keyup.enter="add成员" />
            <button type="button" class="chip-add-btn" :disabled="!成员输入.trim()" @click="add成员">＋</button>
          </div>
        </div>
      </template>
    </div>

    <ul v-show="!collapsed && hasChildren" class="tree-children">
      <OrgNode
        v-for="childName in children"
        :key="childName"
        :名="childName"
        :node="树[childName]"
        :树="树"
        :最高权力机构="最高权力机构"
        :editing="editing"
        @open-detail="emit('open-detail', $event)"
        @add-child="emit('add-child', $event)"
        @remove="emit('remove', $event)"
        @rename="emit('rename', $event)"
        @jump="emit('jump', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 机构运作状态参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

interface 机构Node {
  类型?: string;
  一把手?: string;
  二把手?: string;
  副职?: string[];
  成员?: string[];
  权势指数?: number;
  运作状态?: string;
  当前任务?: string;
  实有人数?: number;
  上级机构?: string;
  制度详情?: Record<string, any> | null;
  子机构?: string[];
}

const props = defineProps<{
  名: string;
  node: 机构Node;
  树: Record<string, 机构Node>;
  最高权力机构: string;
  editing: boolean;
}>();

const emit = defineEmits<{
  'open-detail': [名: string];
  'add-child': [名: string];
  remove: [名: string];
  rename: [payload: { 旧键: string; 新键: string }];
  jump: [名: string];
}>();

const collapsed = ref(false);
const renaming = ref(false);
const newName = ref(props.名);
const flash = ref(false);

const children = computed(() => props.node.子机构 ?? []);
const hasChildren = computed(() => children.value.length > 0);
const isTop = computed(() => props.名 === props.最高权力机构);
const isRevoked = computed(() => props.node.运作状态 === '已撤销');

// 通过 store 获取可变引用，避免直接突变 prop
const store = useDataStore() as any;
const storeNode = computed<Record<string, any>>(() => store.data?.组织结构?.机构?.[props.名] ?? {});

// 沿 上级机构 链上溯至顶层，返回祖先列表（顶层在前，直接父级在后）
const ancestors = computed<string[]>(() => {
  const chain: string[] = [];
  let cur = props.node.上级机构;
  const guard = new Set<string>();
  while (cur && cur !== '' && props.树[cur] && !guard.has(cur)) {
    guard.add(cur);
    chain.unshift(cur);
    cur = props.树[cur]?.上级机构;
  }
  return chain;
});

// 权势指数可视化条
const powerPercent = computed(() => Math.max(0, Math.min(100, Number(props.node.权势指数 ?? 0))));
const powerColor = computed(() => {
  const p = powerPercent.value;
  if (p >= 70) return 'var(--qyc-vermilion)';
  if (p >= 40) return 'var(--qyc-warn)';
  if (p > 0) return 'var(--qyc-ink-faint)';
  return 'var(--qyc-line)';
});

const statusColor = computed(() => {
  const s = props.node.运作状态;
  if (!s) return 'var(--qyc-ink-dim)';
  if (/正常|组建中|秘密运作/.test(s)) return 'var(--qyc-ok)';
  if (/紧张|改组中|空缺待补|被接管/.test(s)) return 'var(--qyc-warn)';
  if (/半瘫痪|瘫痪|已撤销/.test(s)) return 'var(--qyc-danger)';
  return 'var(--qyc-ink-dim)';
});

// ── 编辑模式：类型 + 运作状态 + 副职/成员 ──
const 类型选项 = ['决策核心', '军事指挥', '行政管理', '情报机构', '临时委员会', '司法监察', '意识形态机构', '国营企业'];

// 运作状态：select + custom 双轨
const 运作状态选项 = [...机构运作状态参考列表];
const 运作状态自定义 = ref('');

watch(运作状态自定义, val => {
  if (val) setNode('运作状态', val);
});

watch(
  () => props.editing,
  v => {
    if (v) {
      const cur = storeNode.value.运作状态 || '';
      运作状态自定义.value = 运作状态选项.includes(cur as any) ? '' : cur;
    }
  },
);

function onStatusCustom() {
  if (运作状态自定义.value) storeNode.value.运作状态 = 运作状态自定义.value;
}

// 通用字段写入：通过 storeNode 避免 prop 突变警告
function setNode(key: string, value: any) {
  storeNode.value[key] = value;
}

// 副职 / 成员：本地编辑数组 + 同步回 store
const 副职显示 = ref<string[]>([]);
const 成员显示 = ref<string[]>([]);
const 副职输入 = ref('');
const 成员输入 = ref('');

watch(
  () => storeNode.value.副职,
  val => {
    副职显示.value = [...(val ?? [])];
  },
  { immediate: true },
);

watch(
  () => storeNode.value.成员,
  val => {
    成员显示.value = [...(val ?? [])];
  },
  { immediate: true },
);

function sync副职() {
  setNode('副职', [...副职显示.value]);
}

function sync成员() {
  setNode('成员', [...成员显示.value]);
}

function add副职() {
  const v = 副职输入.value.trim();
  if (v && !副职显示.value.includes(v)) {
    副职显示.value.push(v);
    sync副职();
  }
  副职输入.value = '';
}

function add成员() {
  const v = 成员输入.value.trim();
  if (v && !成员显示.value.includes(v)) {
    成员显示.value.push(v);
    sync成员();
  }
  成员输入.value = '';
}

function startRename() {
  newName.value = props.名;
  renaming.value = true;
}

function commitRename() {
  if (newName.value && newName.value !== props.名) {
    emit('rename', { 旧键: props.名, 新键: newName.value });
  }
  renaming.value = false;
}

defineExpose({
  triggerFlash: () => {
    flash.value = true;
    setTimeout(() => (flash.value = false), 1200);
  },
});
</script>

<script lang="ts">
// 自引用需在非 setup 块中显式声明组件名
export default { name: 'OrgNode' };
</script>

<style lang="scss" scoped>
.tree-node {
  margin: 4px 0;
}

.tree-children {
  list-style: none;
  margin: 0;
  padding: 0 0 0 14px;
  position: relative;
}

/* 父子连接分支线：竖线 + 每个子节点的水平连接 */
.tree-children::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 12px;
  left: 6px;
  width: 1px;
  background: var(--qyc-line);
}

.tree-children .tree-node {
  position: relative;
}

.tree-children .tree-node::before {
  content: '';
  position: absolute;
  top: 14px;
  left: -8px;
  width: 8px;
  height: 1px;
  background: var(--qyc-line);
}

.node-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  font-size: 13px;
}

.node-row.is-top {
  border-color: var(--qyc-vermilion);
  box-shadow: 0 0 0 1px var(--qyc-vermilion-faded) inset;
}

.node-status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--qyc-ink-dim);
}

.node-status-dot.revoked {
  opacity: 0.5;
}

.node-name {
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-weight: 800;
  font-size: 14px;
}

.node-name.is-top {
  color: var(--qyc-vermilion);
}

.node-name.revoked {
  color: var(--qyc-ink-faint);
  text-decoration: line-through;
}

.node-type {
  border: 1px solid var(--qyc-line);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--qyc-ink-faint);
  font-size: 11px;
}

.node-status {
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 700;
}

.node-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 4px 8px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
}

.node-task {
  color: var(--qyc-ink-dim);
}

/* ── 路径面包屑 ── */
.path-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 4px;
  padding: 2px 8px 3px;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  line-height: 1.4;
}

.path-label {
  opacity: 0.7;
}

.path-chip {
  border: none;
  background: transparent;
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-ui);
  font-size: 11px;
  padding: 1px 4px;
  cursor: pointer;
  border-radius: 3px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.path-chip:hover {
  color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  text-decoration: underline;
}

.path-sep {
  color: var(--qyc-line-strong);
  font-size: 10px;
}

.path-current {
  color: var(--qyc-ink-dim);
  font-weight: 700;
}

/* ── 权势指数可视化条 ── */
.power-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.power-bar {
  display: inline-block;
  width: 48px;
  height: 6px;
  border: 1px solid var(--qyc-line);
  border-radius: 3px;
  background: var(--qyc-paper-dark);
  overflow: hidden;
  vertical-align: middle;
}

.power-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* ── 编辑模式表单控件 ── */
.form-select--sm {
  height: 22px;
  border: 1px solid var(--qyc-line);
  border-radius: 5px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 11px;
  padding: 0 4px;
  outline: none;
  cursor: pointer;
  min-width: 72px;
}

.form-select--sm:focus {
  border-color: var(--qyc-vermilion);
}

.form-input--xs {
  height: 22px;
  border: 1px solid var(--qyc-line);
  border-radius: 5px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 11px;
  padding: 0 6px;
  outline: none;
  min-width: 40px;
  max-width: 100px;
  transition: border-color 0.15s ease;
}

.form-input--xs:focus {
  border-color: var(--qyc-vermilion);
}

.form-input--num {
  width: 56px;
  height: 22px;
  border: 1px solid var(--qyc-line);
  border-radius: 5px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 11px;
  padding: 0 6px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input--num:focus {
  border-color: var(--qyc-vermilion);
}

.edit-combo--inline {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}

.edit-field--inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.edit-field--wide {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.edit-label {
  color: var(--qyc-ink-faint);
  font-size: 13px;
  white-space: nowrap;
}

.edit-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
  padding: 2px 0;
}

.edit-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--qyc-line);
  border-radius: 4px;
  background: var(--qyc-paper);
  color: var(--qyc-ink-dim);
  font-size: 11px;
  padding: 1px 5px;
}

.chip-remove {
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--qyc-ink-faint);
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.chip-remove:hover {
  color: var(--qyc-danger);
  background: rgba(178, 34, 34, 0.08);
}

.chip-input {
  height: 20px;
  border: none;
  border-bottom: 1px dotted var(--qyc-line);
  background: transparent;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 11px;
  padding: 0 4px;
  outline: none;
  min-width: 50px;
  flex: 0 1 auto;
}

.chip-input:focus {
  border-bottom-color: var(--qyc-vermilion);
}

.chip-add-btn {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border: 1px solid var(--qyc-line);
  border-radius: 5px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink-dim);
  font-size: 13px;
  font-weight: 700;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.chip-add-btn:hover:not(:disabled) {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  background: rgba(74, 124, 63, 0.06);
}

.chip-add-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.node-array-chip {
  color: var(--qyc-ink-dim);
  font-style: italic;
  font-size: 13px;
}

.icon-btn {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--qyc-ink-faint);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.icon-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.icon-btn--danger:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
}

.collapse-btn {
  margin-left: auto;
}

.rename-input {
  height: 24px;
  border: 1px solid var(--qyc-vermilion);
  border-radius: 5px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 13px;
  font-weight: 800;
  padding: 0 6px;
  outline: none;
  min-width: 80px;
}

.tree-node.flash {
  animation: node-flash 1.2s ease;
}

@keyframes node-flash {
  0%,
  100% {
    background: transparent;
  }
  30% {
    background: rgba(184, 56, 30, 0.18);
  }
}
</style>
