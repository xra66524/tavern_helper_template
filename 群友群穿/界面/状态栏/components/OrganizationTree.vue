<template>
  <div class="org-tree">
    <div class="org-toolbar">
      <span class="org-title">🏛️ 组织结构</span>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </div>

    <!-- 三权指针徽标 -->
    <div v-if="hasTriad" class="triad-row">
      <button
        v-if="triad.决策核心"
        type="button"
        class="triad-chip triad-decision"
        @click="scrollToNode(triad.决策核心!)"
      >
        🧭 决策核心：{{ triad.决策核心 }}
      </button>
      <button v-if="triad.执行首脑" type="button" class="triad-chip triad-exec" @click="scrollToNode(triad.执行首脑!)">
        ⚙️ 执行首脑：{{ triad.执行首脑 }}
      </button>
      <button
        v-if="triad.监督机构"
        type="button"
        class="triad-chip triad-supervise"
        @click="scrollToNode(triad.监督机构!)"
      >
        🔍 监督机构：{{ triad.监督机构 }}
      </button>
    </div>

    <div v-if="顶层机构.length === 0" class="empty-hint">暂无机构数据</div>

    <!-- 机构树 -->
    <ul v-else class="tree-root">
      <OrgNode
        v-for="entry in 顶层机构"
        :key="entry[0]"
        :名="entry[0]"
        :node="entry[1]"
        :树="树"
        :最高权力机构="最高权力机构"
        :editing="editing"
        @open-detail="openDetail"
        @add-child="onAddChild"
        @remove="onRemove"
        @rename="onRename"
        @jump="scrollToNode"
      />
    </ul>

    <button v-if="editing" type="button" class="add-top-btn" @click="onAddTop">＋ 添加顶层机构</button>

    <InstitutionDetailModal v-if="detailName" :机构名="detailName" @close="detailName = ''" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDataStore } from '../store';
import InstitutionDetailModal from './InstitutionDetailModal.vue';
import OrgNode from './OrgNode.vue';

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

const store = useDataStore() as any;
const editing = ref(false);
const detailName = ref('');

const 组织结构 = computed<any>(() => store.data?.组织结构 ?? {});
const 机构表 = computed<Record<string, 机构Node>>(() => 组织结构.value.机构 ?? {});
const 最高权力机构 = computed(() => 组织结构.value.当前最高权力机构 ?? '');

// 扁平化建树
const 树 = computed<Record<string, 机构Node>>(() => {
  const result: Record<string, 机构Node> = {};
  for (const [名, 机构] of Object.entries(机构表.value)) {
    result[名] = { ...机构, 子机构: [] };
  }
  for (const [名, 机构] of Object.entries(result)) {
    const parent = 机构.上级机构;
    if (parent && result[parent]) {
      result[parent].子机构!.push(名);
    }
  }
  return result;
});

const 顶层机构 = computed(() => Object.entries(树.value).filter(([, n]) => !n.上级机构 || n.上级机构 === ''));

// 三权指针
const triad = computed(() => ({
  决策核心: 组织结构.value.当前决策核心,
  执行首脑: 组织结构.value.当前执行首脑,
  监督机构: 组织结构.value.当前监督机构,
}));
const hasTriad = computed(() => Boolean(triad.value.决策核心 || triad.value.执行首脑 || triad.value.监督机构));

function openDetail(名: string) {
  detailName.value = 名;
}

function scrollToNode(名: string) {
  const el = document.querySelector(`[data-org-node="${CSS.escape(名)}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1200);
  }
}

// ── 编辑：增删改 ──
function onAddChild(parentName: string) {
  const 机构 = 机构表.value;
  const 新名 = `新机构 ${Object.keys(机构).length + 1}`;
  机构[新名] = {
    类型: '行政管理',
    一把手: '空缺',
    二把手: '无',
    副职: [],
    成员: [],
    权势指数: 0,
    运作状态: '组建中',
    当前任务: '',
    实有人数: 0,
    上级机构: parentName,
    制度详情: null,
  };
}

function onAddTop() {
  const 机构 = 机构表.value;
  const 新名 = `新机构 ${Object.keys(机构).length + 1}`;
  机构[新名] = {
    类型: '决策核心',
    一把手: '空缺',
    二把手: '无',
    副职: [],
    成员: [],
    权势指数: 0,
    运作状态: '组建中',
    当前任务: '',
    实有人数: 0,
    上级机构: '',
    制度详情: null,
  };
}

function onRemove(名: string) {
  // 同时移除其所有子孙
  const toDelete = new Set<string>([名]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, n] of Object.entries(机构表.value)) {
      if (n.上级机构 && toDelete.has(n.上级机构) && !toDelete.has(k)) {
        toDelete.add(k);
        changed = true;
      }
    }
  }
  const 机构 = 机构表.value;
  for (const k of toDelete) delete 机构[k];
}

function onRename({ 旧键, 新键 }: { 旧键: string; 新键: string }) {
  if (!新键 || 旧键 === 新键) return;
  const 机构 = 机构表.value;
  if (机构[新键]) return; // 冲突
  // 复制节点
  机构[新键] = { ...机构[旧键] };
  delete 机构[旧键];
  // 修正所有子节点的 上级机构 指向
  for (const n of Object.values(机构)) {
    if (n.上级机构 === 旧键) n.上级机构 = 新键;
  }
  // 修正三权指针与最高权力机构
  const o = 组织结构.value;
  if (o.当前最高权力机构 === 旧键) o.当前最高权力机构 = 新键;
  if (o.当前决策核心 === 旧键) o.当前决策核心 = 新键;
  if (o.当前执行首脑 === 旧键) o.当前执行首脑 = 新键;
  if (o.当前监督机构 === 旧键) o.当前监督机构 = 新键;
}
</script>

<style lang="scss" scoped>
.org-tree {
  padding: 4px 2px;
}

.org-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.org-title {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.edit-btn {
  height: 28px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.edit-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.edit-btn.active {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  background: rgba(74, 124, 63, 0.06);
}

.triad-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px dashed var(--qyc-vermilion-faded);
  border-radius: 8px;
  background: rgba(184, 56, 30, 0.04);
}

.triad-chip {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.triad-chip:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.triad-decision {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.triad-exec {
  border-color: var(--qyc-info);
  color: var(--qyc-info);
}

.triad-supervise {
  border-color: var(--qyc-accent);
  color: var(--qyc-accent);
}

.empty-hint {
  padding: 18px 8px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

.add-top-btn {
  width: 100%;
  margin-top: 10px;
  height: 32px;
  border: 1px dashed var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-ui);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.add-top-btn:hover {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  border-style: solid;
}

.tree-root {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
