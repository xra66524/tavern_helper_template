<template>
  <div class="tech-panel">
    <header class="tech-header">
      <div>
        <p class="tech-kicker">TECH TREE ARCHIVE</p>
        <h3>🔬 科技树面板</h3>
      </div>
      <span class="autonomy-badge" :class="autonomyClass">{{ tech.科技自主度 || '未知' }}</span>
    </header>

    <section class="status-strip">
      <div class="status-item">
        <span class="label">发展方针</span>
        <span class="value">{{ tech.科技发展方针 || '未记录' }}</span>
      </div>
      <div class="status-item">
        <span class="label">保密等级</span>
        <span class="value">{{ tech.技术保密等级 || '未记录' }}</span>
      </div>
      <div v-if="!科技树已完成" class="status-item">
        <span class="label">主要槽</span>
        <span class="value">{{ majorUsed }} / {{ 主要槽上限 }}</span>
      </div>
      <div v-if="!科技树已完成" class="status-item">
        <span class="label">次要槽</span>
        <span class="value">{{ minorUsed }} / {{ 次要槽上限 }}</span>
      </div>
    </section>

    <section v-if="科技树已完成" class="complete-panel">
      <div class="complete-stamp">🏆 科技树 · 使命完成</div>
      <p class="complete-quote">政权获得独立发起大规模跨学科科研计划的能力。</p>
      <div class="complete-grid">
        <span>解锁节点</span><strong>{{ 已完成节点.size }} / {{ 节点全貌列表.length }}</strong> <span>科技自主度</span
        ><strong>{{ tech.科技自主度 || '未知' }}</strong> <span>当前日期</span
        ><strong>{{ store.data.世界?.当前日期 || '未记录' }}</strong>
      </div>
      <p class="archive-note">后续科研不再受科技树 DAG 约束，本面板转为只读档案模式。</p>
      <button type="button" class="outline-btn" @click="showArchiveDag = !showArchiveDag">
        {{ showArchiveDag ? '收起完整科技树档案' : '📋 查看完整科技树档案' }}
      </button>
    </section>

    <template v-else>
      <section class="slot-section">
        <ResearchSlotGroup
          title="主要研究槽"
          icon="🟡"
          type="主要"
          :slots="majorSlots"
          :used="majorUsed"
          :limit="主要槽上限"
          :can-add="主要槽可添加"
          full-hint="需完成更多整合型节点以扩容主要研究槽"
          @add="openCandidateModal('主要')"
          @remove="removeFromSlot('主要研究槽', $event)"
          @inspect="inspectByName"
        />

        <ResearchSlotGroup
          title="次要研究槽"
          icon="🔵"
          type="次要"
          :slots="minorSlots"
          :used="minorUsed"
          :limit="次要槽上限"
          :can-add="次要槽可添加"
          full-hint="需完成更多系统性基础节点以扩容次要研究槽"
          @add="openCandidateModal('次要')"
          @remove="removeFromSlot('次要研究槽', $event)"
          @inspect="inspectByName"
        />
      </section>
    </template>

    <section class="progress-overview">
      <div class="section-title">📈 分支进度概览</div>
      <div class="branch-grid">
        <div v-for="branch in 分支进度列表" :key="branch.分支名" class="branch-row">
          <div class="branch-meta">
            <span>{{ branch.分支名 }}</span>
            <span>{{ branch.已完成数 }}/{{ branch.总节点数 }} · {{ branch.进度百分比 }}%</span>
          </div>
          <div class="branch-bar"><div class="branch-fill" :style="{ width: `${branch.进度百分比}%` }" /></div>
        </div>
      </div>
    </section>

    <section v-if="!科技树已完成 || showArchiveDag" class="dag-section">
      <div class="dag-toolbar">
        <div class="section-title">🧬 科技 DAG 可视化</div>
        <div class="view-switch">
          <button type="button" :class="{ active: viewMode === 'active' }" @click="viewMode = 'active'">活跃</button>
          <button type="button" :class="{ active: viewMode === 'branches' }" @click="viewMode = 'branches'">
            分支
          </button>
          <button type="button" :class="{ active: viewMode === 'full' }" @click="viewMode = 'full'">全量</button>
        </div>
      </div>

      <div v-if="viewMode === 'active'" class="node-list">
        <button
          v-for="node in activeNodes"
          :key="node.节点名"
          type="button"
          class="node-card"
          :class="`status-${node.状态}`"
          @click="selectedNode = node"
        >
          <span class="node-title">{{ node.节点名 }}</span>
          <span class="node-meta">{{ node.所属分支 }} · {{ node.状态 }}</span>
          <span v-if="node.研发进度 > 0 && node.研发进度 < 100" class="mini-progress">
            <i :style="{ width: `${node.研发进度}%` }"></i>
          </span>
        </button>
      </div>

      <div v-else-if="viewMode === 'branches'" class="branch-node-list">
        <details v-for="group in nodesByBranch" :key="group.branch" class="branch-detail">
          <summary>{{ group.branch }}（{{ group.nodes.length }}）</summary>
          <div class="branch-nodes">
            <button
              v-for="node in group.nodes"
              :key="node.节点名"
              type="button"
              class="compact-node"
              :class="`status-${node.状态}`"
              @click="selectedNode = node"
            >
              <span>{{ nodeStatusIcon(node.状态) }}</span>
              <span>{{ node.节点名 }}</span>
              <small>{{ stageLabel(node.拓扑层级) }}</small>
            </button>
          </div>
        </details>
      </div>

      <div v-else class="dag-container">
        <div v-for="(layer, li) in 节点按层级分组" :key="li" class="dag-layer">
          <div class="layer-label">{{ stageLabel(li) }}</div>
          <button
            v-for="node in layer"
            :key="node.节点名"
            type="button"
            class="dag-node"
            :class="`status-${node.状态}`"
            @click="selectedNode = node"
          >
            <span>{{ node.节点名 }}</span>
            <b>{{ nodeStatusIcon(node.状态) }}</b>
            <i v-if="node.研发进度 > 0 && node.研发进度 < 100" :style="{ width: `${node.研发进度}%` }"></i>
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="candidateModalType" class="modal-mask" @click="closeCandidateModal">
        <article class="candidate-modal" @click.stop>
          <header class="modal-header">
            <div>
              <p class="modal-kicker">ADD RESEARCH NODE</p>
              <h3>添加至{{ candidateModalType }}研究槽</h3>
            </div>
            <button type="button" class="close-btn" @click="closeCandidateModal">✕</button>
          </header>

          <input v-model="candidateSearch" class="search-input" type="text" placeholder="搜索节点 / 分支 / 描述..." />

          <div v-if="filteredCandidateGroups.length === 0" class="empty-hint modal-empty">暂无可添加候选节点</div>
          <div v-else class="candidate-groups">
            <section v-for="group in filteredCandidateGroups" :key="group.branch" class="candidate-group">
              <h4>{{ group.branch }}（{{ group.nodes.length }}）</h4>
              <label v-for="candidate in group.nodes" :key="candidate.节点名" class="candidate-row">
                <input
                  type="checkbox"
                  :checked="selectedCandidateNames.has(candidate.节点名)"
                  :disabled="
                    !selectedCandidateNames.has(candidate.节点名) &&
                    selectedCandidateNames.size >= candidateCapacityLeft
                  "
                  @change="toggleCandidate(candidate.节点名)"
                />
                <span class="candidate-main">
                  <strong>{{ candidate.节点名 }}</strong>
                  <small>{{ candidate.研发总耗时_天 }}天 · {{ candidate.描述 }}</small>
                </span>
              </label>
            </section>
          </div>

          <footer class="candidate-actions">
            <span>可添加 {{ candidateCapacityLeft }} 项，已选择 {{ selectedCandidateNames.size }} 项</span>
            <div>
              <button type="button" class="ghost-btn" @click="closeCandidateModal">取消</button>
              <button
                type="button"
                class="confirm-btn"
                :disabled="selectedCandidateNames.size === 0"
                @click="confirmAddCandidates"
              >
                确认添加
              </button>
            </div>
          </footer>
        </article>
      </div>
    </Teleport>

    <TechNodeCard
      v-if="selectedNode"
      :node="selectedNode"
      :completed-names="completedNameList"
      @close="selectedNode = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, toRef, type PropType } from 'vue';
import type { 候选节点, 研究槽, 研究槽类型, 节点全貌 } from '../../../../src/群友群穿/界面/状态栏/tech_tree_utils';
import { useTechTreeData, 预计剩余天数 } from '../../../../src/群友群穿/界面/状态栏/tech_tree_utils';
import { useDataStore } from '../store';
import TechNodeCard from './TechNodeCard.vue';

const ResearchSlotGroup = defineComponent({
  name: 'ResearchSlotGroup',
  props: {
    title: { type: String, required: true },
    icon: { type: String, required: true },
    type: { type: String as PropType<研究槽类型>, required: true },
    slots: { type: Array as PropType<研究槽[]>, required: true },
    used: { type: Number, required: true },
    limit: { type: Number, required: true },
    canAdd: { type: Boolean, required: true },
    fullHint: { type: String, required: true },
  },
  emits: ['add', 'remove', 'inspect'],
  setup(props, { emit }) {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
    return () =>
      h('section', { class: ['slot-card', props.type === '主要' ? 'major-card' : 'minor-card'] }, [
        h('header', { class: 'slot-head' }, [
          h('div', { class: 'slot-title' }, [
            h('span', props.icon),
            h('strong', props.title),
            h('em', `${props.used}/${props.limit}`),
          ]),
          h(
            'button',
            {
              type: 'button',
              class: 'add-btn',
              disabled: !props.canAdd,
              title: props.canAdd ? '添加节点' : props.fullHint,
              onClick: () => emit('add'),
            },
            '添加节点',
          ),
        ]),
        h('div', { class: 'slot-body' }, [
          props.slots.length === 0
            ? h('div', { class: 'slot-empty' }, [
                h('span', { class: 'slot-empty-icon' }, props.icon),
                h('span', '暂无研究节点，点击右上角「＋ 添加节点」开始研发'),
              ])
            : h(
                'div',
                { class: 'slot-list' },
                props.slots.map((slot, index) => {
                  const progress = clamp(slot.研发进度);
                  const remaining = 预计剩余天数(slot.节点名, progress);
                  return h('article', { class: ['slot-item', props.type === '主要' ? 'major' : 'minor'] }, [
                    h('div', { class: 'slot-item-head' }, [
                      h('span', { class: 'slot-index' }, `#${index + 1}`),
                      h('span', { class: 'slot-type-dot' }, props.icon),
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'slot-name',
                          title: '查看节点详情',
                          onClick: () => emit('inspect', slot.节点名),
                        },
                        slot.节点名 || '未命名节点',
                      ),
                      h('button', {
                        type: 'button',
                        class: 'remove-btn',
                        title: '移除该节点',
                        onClick: () => emit('remove', index),
                      }),
                    ]),
                    h('div', { class: 'slot-progress-wrap' }, [
                      h('div', { class: 'slot-progress' }, [h('i', { style: { width: `${progress}%` } })]),
                      h('span', { class: 'slot-progress-text' }, `${progress}%`),
                    ]),
                    h('div', { class: 'slot-item-foot' }, [
                      h('span', { class: 'foot-chip remaining' }, [
                        h('i', '⏳'),
                        h('em', remaining > 0 ? `剩余 ${remaining} 天` : '即将完成'),
                      ]),
                      h('span', { class: 'foot-chip start' }, [h('i', '📅'), h('em', slot.启动日期 || '未记录')]),
                    ]),
                  ]);
                }),
              ),
          !props.canAdd ? h('p', { class: 'full-hint' }, [h('span', '⚠ '), props.fullHint]) : null,
        ]),
      ]);
  },
});

const store = useDataStore() as any;
const tech = computed(() => store.data.科技树 ?? {});
const majorSlotsRef = toRef(store.data.科技树, '主要研究槽');
const minorSlotsRef = toRef(store.data.科技树, '次要研究槽');
const unlockedRef = toRef(store.data.科技树, '已解锁能力清单');

const {
  已完成节点,
  节点全貌列表,
  候选节点列表,
  分支进度列表,
  节点按层级分组,
  活跃节点列表,
  主要槽上限,
  次要槽上限,
  主要槽可添加,
  次要槽可添加,
  科技树已完成,
} = useTechTreeData(majorSlotsRef, minorSlotsRef, unlockedRef);

const viewMode = ref<'active' | 'branches' | 'full'>('active');
const showArchiveDag = ref(false);
const selectedNode = ref<节点全貌 | null>(null);
const candidateModalType = ref<研究槽类型 | ''>('');
const candidateSearch = ref('');
const selectedCandidateNames = ref<Set<string>>(new Set());

const majorSlots = computed<研究槽[]>(() => (Array.isArray(tech.value.主要研究槽) ? tech.value.主要研究槽 : []));
const minorSlots = computed<研究槽[]>(() => (Array.isArray(tech.value.次要研究槽) ? tech.value.次要研究槽 : []));
const majorUsed = computed(() => majorSlots.value.filter(slot => slot.节点名).length);
const minorUsed = computed(() => minorSlots.value.filter(slot => slot.节点名).length);
const completedNameList = computed(() => Array.from(已完成节点.value));
const activeNodes = computed(() => 活跃节点列表.value.slice(0, 80));

const autonomyClass = computed(() => {
  const value = String(tech.value.科技自主度 ?? '');
  if (/完全依赖|依赖/.test(value)) return 'danger';
  if (/部分|有限|初步/.test(value)) return 'warn';
  if (/基本|高度|自主/.test(value)) return 'ok';
  return 'unknown';
});

const nodesByBranch = computed(() => {
  const map = new Map<string, 节点全貌[]>();
  for (const node of 节点全貌列表.value) {
    if (!map.has(node.所属分支)) map.set(node.所属分支, []);
    map.get(node.所属分支)!.push(node);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a === '系统性科研' ? 1 : b === '系统性科研' ? -1 : a.localeCompare(b, 'zh-CN')))
    .map(([branch, nodes]) => ({
      branch,
      nodes: nodes.sort((a, b) => a.拓扑层级 - b.拓扑层级 || a.研发总耗时_天 - b.研发总耗时_天),
      hasActive: nodes.some(n => n.状态 === '主要' || n.状态 === '次要' || n.状态 === '可启动'),
    }));
});

const candidateCapacityLeft = computed(() => {
  if (candidateModalType.value === '主要') return Math.max(0, 主要槽上限.value - majorUsed.value);
  if (candidateModalType.value === '次要') return Math.max(0, 次要槽上限.value - minorUsed.value);
  return 0;
});

const filteredCandidateGroups = computed(() => {
  const q = candidateSearch.value.trim().toLowerCase();
  const map = new Map<string, 候选节点[]>();
  for (const node of 候选节点列表.value) {
    const haystack = `${node.节点名} ${node.所属分支} ${node.描述}`.toLowerCase();
    if (q && !haystack.includes(q)) continue;
    if (!map.has(node.所属分支)) map.set(node.所属分支, []);
    map.get(node.所属分支)!.push(node);
  }
  return Array.from(map.entries()).map(([branch, nodes]) => ({ branch, nodes }));
});

function stageLabel(level: number): string {
  if (level <= 2) return 'Stage 1';
  if (level <= 5) return 'Stage 2';
  return 'Stage 3';
}

function nodeStatusIcon(status: string) {
  if (status === '已完成') return '✅';
  if (status === '主要') return '🟡';
  if (status === '次要') return '🔵';
  if (status === '可启动') return '🟢';
  return '🔒';
}

function inspectByName(name: string) {
  const node = 节点全貌列表.value.find(item => item.节点名 === name);
  if (node) selectedNode.value = node;
}

function openCandidateModal(type: 研究槽类型) {
  if (科技树已完成.value) return;
  candidateModalType.value = type;
  candidateSearch.value = '';
  selectedCandidateNames.value = new Set();
}

function closeCandidateModal() {
  candidateModalType.value = '';
  selectedCandidateNames.value = new Set();
}

function toggleCandidate(name: string) {
  const next = new Set(selectedCandidateNames.value);
  if (next.has(name)) next.delete(name);
  else if (next.size < candidateCapacityLeft.value) next.add(name);
  selectedCandidateNames.value = next;
}

function confirmAddCandidates() {
  if (!candidateModalType.value || selectedCandidateNames.value.size === 0) return;
  const target = candidateModalType.value === '主要' ? majorSlots.value : minorSlots.value;
  for (const name of selectedCandidateNames.value) {
    if (
      target.filter(slot => slot.节点名).length >=
      (candidateModalType.value === '主要' ? 主要槽上限.value : 次要槽上限.value)
    )
      break;
    target.push({ 节点名: name, 研发进度: 0, 启动日期: store.data.世界?.当前日期 || '' });
  }
  closeCandidateModal();
}

function removeFromSlot(type: '主要研究槽' | '次要研究槽', index: number) {
  const target = type === '主要研究槽' ? majorSlots.value : minorSlots.value;
  target.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.tech-panel {
  padding: 4px 2px;
}

.tech-header,
.dag-toolbar,
.modal-header,
.candidate-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tech-kicker,
.modal-kicker {
  margin: 0 0 4px;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.tech-header h3,
.modal-header h3 {
  margin: 0;
  font-family: var(--qyc-font-title);
  font-size: 18px;
}

.autonomy-badge {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  background: var(--qyc-paper-light);
  font-size: 12px;
  font-weight: 800;
  padding: 5px 10px;
}
.autonomy-badge.ok {
  color: var(--qyc-ok);
  border-color: var(--qyc-ok);
}
.autonomy-badge.warn {
  color: var(--qyc-warn);
  border-color: var(--qyc-warn);
}
.autonomy-badge.danger {
  color: var(--qyc-danger);
  border-color: var(--qyc-danger);
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0;
}

.status-item,
.progress-overview,
.dag-section,
.complete-panel {
  border: 1px solid var(--qyc-line);
  border-radius: 10px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.05);
}

.status-item {
  padding: 8px;
}
.status-item .label {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
}
.status-item .value {
  display: block;
  margin-top: 3px;
  font-size: 13px;
  font-weight: 800;
}

.outline-btn,
.ghost-btn,
.confirm-btn {
  height: 30px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 800;
  padding: 0 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.outline-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}
.confirm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.complete-panel {
  padding: 14px;
  margin-bottom: 10px;
  text-align: center;
}
.complete-stamp {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 20px;
  font-weight: 900;
}
.complete-quote {
  color: var(--qyc-ink-dim);
  line-height: 1.55;
}
.complete-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  text-align: left;
  font-size: 13px;
}
.complete-grid span {
  color: var(--qyc-ink-faint);
}
.archive-note {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.progress-overview,
.dag-section {
  padding: 10px;
  margin-bottom: 10px;
}
.section-title {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 15px;
  font-weight: 900;
}
.branch-grid {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.branch-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.branch-bar {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--qyc-paper-dark);
  margin-top: 4px;
}
.branch-fill {
  height: 100%;
  background: var(--qyc-ok);
}

.view-switch {
  display: inline-flex;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  overflow: hidden;
}
.view-switch button {
  border: 0;
  border-right: 1px solid var(--qyc-line);
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  padding: 5px 8px;
  cursor: pointer;
}
.view-switch button:last-child {
  border-right: 0;
}
.view-switch button.active {
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-vermilion);
  font-weight: 900;
}

.node-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.node-card,
.compact-node,
.dag-node {
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper);
  text-align: left;
  cursor: pointer;
}
.node-card {
  min-height: 72px;
  padding: 8px;
}
.node-title {
  display: block;
  font-size: 13px;
  font-weight: 900;
}
.node-meta {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-top: 5px;
}
.mini-progress {
  display: block;
  height: 5px;
  border-radius: 999px;
  background: var(--qyc-paper-dark);
  overflow: hidden;
  margin-top: 8px;
}
.mini-progress i {
  display: block;
  height: 100%;
  background: var(--qyc-warn);
}

.status-已完成 {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
}
.status-主要 {
  border-color: var(--qyc-warn);
}
.status-次要 {
  border-color: var(--qyc-info);
}
.status-可启动 {
  border-style: dashed;
}
.status-锁定 {
  color: var(--qyc-ink-faint);
  opacity: 0.72;
}

.branch-node-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.branch-detail {
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  padding: 8px;
}
.branch-detail summary {
  cursor: pointer;
  font-weight: 900;
}
.branch-nodes {
  display: grid;
  gap: 5px;
  margin-top: 8px;
}
.compact-node {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 5px 7px;
  font-size: 12px;
}
.compact-node small {
  color: var(--qyc-ink-faint);
}

.dag-container {
  overflow-x: auto;
  display: flex;
  gap: 10px;
  padding: 8px 2px;
  margin-top: 10px;
}
.dag-layer {
  min-width: 150px;
  display: grid;
  align-content: start;
  gap: 7px;
}
.layer-label {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 900;
}
.dag-node {
  position: relative;
  min-height: 44px;
  padding: 6px;
  font-size: 11px;
}
.dag-node b {
  float: right;
}
.dag-node i {
  position: absolute;
  left: 6px;
  bottom: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
}

.modal-mask {
  position: fixed;
  z-index: 9998;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: rgba(26, 14, 8, 0.42);
  backdrop-filter: blur(2px);
}
.candidate-modal {
  width: min(560px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 14px;
  background: var(--qyc-paper-light);
  padding: 14px;
  box-shadow: 0 18px 50px rgba(26, 14, 8, 0.28);
}
.close-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.search-input {
  width: 100%;
  height: 34px;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper);
  padding: 0 10px;
  margin: 10px 0;
}
.candidate-groups {
  overflow: auto;
  display: grid;
  gap: 8px;
  padding-right: 2px;
}
.candidate-group {
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  padding: 8px;
}
.candidate-group h4 {
  margin: 0 0 6px;
  color: var(--qyc-vermilion);
  font-size: 13px;
}
.candidate-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 0;
  border-top: 1px dashed rgba(160, 140, 116, 0.5);
  cursor: pointer;
}
.candidate-row:first-of-type {
  border-top: 0;
}
.candidate-main strong {
  display: block;
  font-size: 13px;
}
.candidate-main small {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  line-height: 1.4;
}
.candidate-actions {
  border-top: 1px solid var(--qyc-line);
  margin-top: 10px;
  padding-top: 10px;
  color: var(--qyc-ink-faint);
  font-size: 12px;
}
.candidate-actions > div {
  display: flex;
  gap: 8px;
}
.confirm-btn {
  background: var(--qyc-vermilion);
  color: var(--qyc-paper-light);
  border-color: var(--qyc-vermilion);
}
.modal-empty {
  padding: 20px;
  text-align: center;
}

@media (max-width: 420px) {
  .status-strip {
    grid-template-columns: 1fr;
  }
  .dag-toolbar,
  .candidate-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

<style lang="scss">
.slot-section {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}
.slot-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--qyc-paper-light) 0%, var(--qyc-paper) 100%);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
  transition: box-shadow 0.15s ease;
}
.slot-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 12px 12px 0 0;
}
.slot-card.major-card::before {
  background: linear-gradient(90deg, var(--qyc-warn) 0%, #d4830d 100%);
}
.slot-card.minor-card::before {
  background: linear-gradient(90deg, var(--qyc-info) 0%, #5a7aa0 100%);
}
.slot-card {
  padding: 0;
}
.slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--qyc-line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
}
.slot-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slot-title span {
  font-size: 18px;
  line-height: 1;
}
.slot-title strong {
  font-family: var(--qyc-font-title);
  font-size: 16px;
  font-weight: 900;
  color: var(--qyc-ink);
  letter-spacing: 0.06em;
}
.slot-title em {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  background: var(--qyc-paper-dark);
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.slot-body {
  padding: 10px 14px 14px;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-dark);
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 800;
  padding: 0 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.add-btn:not(:disabled):hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.06);
}
.add-btn:not(:disabled)::before {
  content: '＋';
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
}
.add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.slot-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 10px;
  border: 1px dashed var(--qyc-line);
  border-radius: 9px;
  background: rgba(242, 232, 213, 0.4);
  color: var(--qyc-ink-faint);
  font-size: 12px;
  line-height: 1.5;
}
.slot-empty-icon {
  font-size: 18px;
  opacity: 0.7;
}
.slot-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.slot-item {
  position: relative;
  border: 1px solid var(--qyc-line-strong);
  border-left: 4px solid var(--qyc-line-strong);
  border-radius: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, var(--qyc-paper-light) 0%, var(--qyc-paper) 100%);
  box-shadow: 0 2px 6px rgba(44, 24, 16, 0.06);
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.slot-item:hover {
  box-shadow: 0 4px 12px rgba(44, 24, 16, 0.1);
  transform: translateY(-1px);
}
.slot-item.major {
  border-left-color: var(--qyc-warn);
}
.slot-item.minor {
  border-left-color: var(--qyc-info);
}
.slot-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.slot-index {
  flex: 0 0 auto;
  min-width: 26px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-dark);
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 800;
}
.slot-type-dot {
  font-size: 13px;
  line-height: 1;
}
.slot-name {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 15px;
  font-weight: 900;
  text-align: left;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.slot-name:hover {
  color: var(--qyc-vermilion);
}
.remove-btn {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink-faint);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.remove-btn::before {
  content: '✕';
}
.remove-btn:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
  background: rgba(178, 34, 34, 0.06);
}
.slot-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 8px;
}
.slot-progress {
  flex: 1 1 auto;
  height: 10px;
  overflow: hidden;
  border: 1px solid var(--qyc-line);
  border-radius: 999px;
  background: var(--qyc-paper-dark);
  box-shadow: inset 0 1px 2px rgba(44, 24, 16, 0.1);
}
.slot-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}
.major .slot-progress i {
  background: linear-gradient(90deg, #d4830d 0%, var(--qyc-warn) 100%);
}
.minor .slot-progress i {
  background: linear-gradient(90deg, #5a7aa0 0%, var(--qyc-info) 100%);
}
.slot-progress-text {
  flex: 0 0 auto;
  min-width: 38px;
  text-align: right;
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
  font-weight: 800;
}
.slot-item-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.foot-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--qyc-line);
  border-radius: 999px;
  background: var(--qyc-paper-light);
  padding: 2px 8px;
  color: var(--qyc-ink-dim);
  font-size: 11px;
  line-height: 1.5;
}
.foot-chip i {
  font-style: normal;
  font-size: 11px;
}
.foot-chip em {
  font-style: normal;
  font-weight: 700;
}
.foot-chip.remaining {
  border-color: var(--qyc-warn-faded, #d4836b);
  color: var(--qyc-warn);
}
.foot-chip.start {
  color: var(--qyc-ink-faint);
}
.full-hint {
  margin: 10px 0 0;
  padding: 6px 10px;
  border: 1px dashed var(--qyc-warn);
  border-radius: 8px;
  background: rgba(184, 115, 22, 0.06);
  color: var(--qyc-warn);
  font-size: 12px;
  line-height: 1.5;
}
</style>
