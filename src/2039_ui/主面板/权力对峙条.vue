<template>
  <section class="standoff-card panel-section">
    <div class="section-title">
      <span>⚡ 权力对峙：内阁 vs 事务次官会议</span>
    </div>

    <div v-if="!council" class="empty-box">情报不足 — 事务次官会议数据不可用</div>
    <template v-else>
      <div class="standoff-grid">
        <div class="side-card cabinet-side">
          <div class="side-title">内阁侧</div>
          <MetricRow label="稳定度" :value="percentText(stability)" :percent="stability" tone="positive" />
          <MetricRow label="控制力" :value="data.$政府控制力 || '--'" />
          <MetricRow
            label="被渗透"
            :value="percentText(council.首相官邸渗透程度)"
            :percent="council.首相官邸渗透程度"
            tone="negative"
          />
          <MetricRow label="首相状态" :value="cabinet?.首相状态 || '--'" />
        </div>

        <div class="side-card council-side">
          <div class="side-title">事务次官会议侧</div>
          <MetricRow label="权力" :value="council.实际权力等级 || '--'" />
          <MetricRow label="合法性" :value="council.合法性 || '--'" />
          <MetricRow label="凝聚力" :value="percentText(council.凝聚力)" :percent="council.凝聚力" tone="positive" />
          <MetricRow
            label="CSAT渗透"
            :value="percentText(council.CSAT渗透程度)"
            :percent="council.CSAT渗透程度"
            tone="negative"
          />
          <MetricRow
            label="美国残余"
            :value="percentText(council.美国残余影响力)"
            :percent="council.美国残余影响力"
            tone="neutral"
          />
        </div>
      </div>

      <div class="verdict">{{ verdict }}</div>

      <button class="fold-trigger" type="button" @click="relationOpen = !relationOpen">
        <span>双向关系视角</span>
        <span>{{ relationOpen ? '收起 ▴' : '展开 ▾' }}</span>
      </button>
      <Transition name="fold">
        <div v-if="relationOpen" class="fold-body">
          <InfoLine label="事务次官会议对内阁" :value="council.与内阁的关系" />
          <InfoLine label="内阁态度" :value="council.内阁对事务次官会议的态度" />
          <InfoLine label="会议状态" :value="council.当前状态" />
          <InfoLine label="决策方式" :value="council.决策方式" />
          <InfoLine label="当前焦点" :value="council.当前焦点议题" wide />
        </div>
      </Transition>

      <button class="fold-trigger" type="button" @click="decisionOpen = !decisionOpen">
        <span>已决议事项（最近3条）</span>
        <span>{{ decisionOpen ? '收起 ▴' : '展开 ▾' }}</span>
      </button>
      <Transition name="fold">
        <div v-if="decisionOpen" class="decision-list">
          <div v-if="recentDecisions.length === 0" class="empty-mini">暂无已决议事项</div>
          <div v-for="item in recentDecisions" :key="`${item.事项}-${item.执行状态}`" class="decision-item">
            <span class="decision-text">{{ item.事项 || '未命名事项' }}</span>
            <span class="status-chip" :style="chipStyle(item.执行状态)">{{ item.执行状态 || '--' }}</span>
          </div>
        </div>
      </Transition>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import type { MvuData } from '../../2039_mvu/types';

const props = defineProps<{
  data: MvuData;
}>();

type Council = MvuData['日本执政']['事务次官会议'];
type Cabinet = MvuData['日本执政'];
type Decision = Council['已决议事项'][number];

const relationOpen = ref(false);
const decisionOpen = ref(false);

const cabinet = computed<Cabinet | undefined>(() => props.data.日本执政);
const council = computed<Council | undefined>(() => props.data.日本执政?.事务次官会议);
const stability = computed(() => safeNumber(props.data.日本执政?.本届内阁?.内阁稳定度));
const recentDecisions = computed<Decision[]>(() => (council.value?.已决议事项 ?? []).slice(-3));

const verdict = computed(() => {
  const c = council.value;
  const s = stability.value;
  const primeStatus = cabinet.value?.首相状态;
  const power = c?.实际权力等级;
  const relation = c?.与内阁的关系;
  const status = c?.当前状态;

  if (primeStatus === '空位') return '无首相状态下，事务次官会议全面接管政务';
  if (s < 20 && (power === '主导政府运作' || power === '完全替代内阁')) return '内阁被严重架空，事务次官会议实际掌权';
  if (s < 50 && power === '主导政府运作') return '内阁处于弱势，事务次官会议主导决策';
  if (relation === '公开对立' || relation === '操控内阁') return '事务次官会议与内阁处于对抗状态，权力争斗激烈';
  if (s >= 70) return '内阁有效掌控政府，事务次官会议处于从属地位';
  if (s >= 50 && power !== '主导政府运作' && power !== '完全替代内阁') return '内阁与事务次官会议形成均势';
  if (status === '决策瘫痪' || status === '被架空') return '事务次官会议内部混乱，决策能力严重受损';
  return '权力格局研判中';
});

const MetricRow = defineComponent({
  name: 'MetricRow',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    percent: { type: Number, default: undefined },
    tone: { type: String, default: 'neutral' },
  },
  setup(rowProps) {
    return () =>
      h('div', { class: 'metric-row' }, [
        h('span', { class: 'metric-label' }, rowProps.label),
        h('span', { class: 'metric-value' }, rowProps.value),
        typeof rowProps.percent === 'number'
          ? h('span', { class: 'mini-track' }, [
              h('span', {
                class: ['mini-fill', rowProps.tone],
                style: { width: `${clamp(rowProps.percent)}%` },
              }),
            ])
          : null,
      ]);
  },
});

const InfoLine = defineComponent({
  name: 'InfoLine',
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
    wide: { type: Boolean, default: false },
  },
  setup(lineProps) {
    return () =>
      h('div', { class: ['info-line', { wide: lineProps.wide }] }, [
        h('span', { class: 'info-label' }, lineProps.label),
        h('span', { class: 'info-value' }, lineProps.value || '--'),
      ]);
  },
});

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value) : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function percentText(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '--';
}

function chipStyle(value: string) {
  const colors: Record<string, string> = {
    执行中: '#3b82f6',
    已执行: '#22c55e',
    搁置: '#eab308',
    被内阁推翻: '#f97316',
    受阻: '#ef4444',
  };
  return { borderColor: colors[value] ?? '#64748b', color: colors[value] ?? '#94a3b8' };
}
</script>

<style scoped lang="scss">
.panel-section {
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.52);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.standoff-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
}

.side-card {
  padding: 9px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(2, 6, 23, 0.32);
}

.side-title {
  margin-bottom: 7px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 800;
}

:deep(.metric-row) {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 4px 8px;
  align-items: center;
  margin: 5px 0;
  font-size: 12px;
}

:deep(.metric-label) {
  color: #64748b;
}

:deep(.metric-value) {
  min-width: 0;
  color: #e2e8f0;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.mini-track) {
  grid-column: 1 / -1;
  height: 4px;
  overflow: hidden;
  background: rgba(51, 65, 85, 0.7);
}

:deep(.mini-fill) {
  display: block;
  height: 100%;
  transition: width 0.3s ease;
  background: #3b82f6;
}

:deep(.mini-fill.positive) {
  background: linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e);
}

:deep(.mini-fill.negative) {
  background: linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444);
}

.verdict {
  margin: 0 10px 10px;
  padding: 8px 10px;
  border-left: 3px solid #f97316;
  background: rgba(249, 115, 22, 0.1);
  color: #fed7aa;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.fold-trigger {
  display: flex;
  justify-content: space-between;
  width: calc(100% - 20px);
  margin: 0 10px 8px;
  padding: 7px 9px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(30, 41, 59, 0.38);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.fold-body,
.decision-list {
  margin: 0 10px 10px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(2, 6, 23, 0.25);
}

:deep(.info-line) {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

:deep(.info-label) {
  color: #64748b;
}

:deep(.info-value) {
  color: #cbd5e1;
}

.decision-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);

  &:last-child {
    border-bottom: none;
  }
}

.decision-text {
  color: #cbd5e1;
}

.status-chip {
  flex-shrink: 0;
  padding: 1px 5px;
  border-left: 2px solid;
  background: rgba(15, 23, 42, 0.65);
  font-weight: 800;
}

.empty-box,
.empty-mini {
  padding: 12px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.fold-enter-active,
.fold-leave-active {
  transition: all 0.18s ease;
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@container main-panel (max-width: 430px) {
  .standoff-grid {
    grid-template-columns: 1fr;
  }

  :deep(.info-line) {
    grid-template-columns: 82px minmax(0, 1fr);
  }
}
</style>
