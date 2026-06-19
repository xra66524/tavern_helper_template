<template>
  <div class="cabinet-panel">
    <div v-if="!hasData" class="skeleton-cabinet">
      <div class="skeleton-block w60"></div>
      <div class="skeleton-block h60"></div>
      <div class="skeleton-block h84"></div>
      <div class="skeleton-block h120"></div>
    </div>

    <template v-else>
      <header class="cabinet-header">
        <div>
          <span class="eyebrow">GOVERNMENT CORE</span>
          <h2>🏛️ 内阁面板</h2>
        </div>
        <span class="status-stamp" :style="chipStyle(cabinet.首相状态, 'pm')">{{ cabinet.首相状态 || '--' }}</span>
      </header>

      <section class="overview panel-section">
        <div class="section-title">内阁概况</div>
        <div v-if="cabinet.首相状态 === '空位' && ministers.length === 0" class="empty-box">内阁尚未组建</div>
        <div class="overview-grid">
          <InfoTile label="首相" :value="primeMinisterText" />
          <InfoTile
            label="政治立场"
            :value="innerCabinet.首相政治立场 || '--'"
            :style="chipStyle(innerCabinet.首相政治立场, 'stance')"
          />
          <InfoTile label="届数" :value="`第${innerCabinet.届数 ?? 0}届`" />
          <InfoTile label="执政联盟" :value="coalitionText" />
        </div>
        <div class="stability-line">
          <span>内阁稳定度</span>
          <span class="stability-track"
            ><span :style="{ width: `${stability}%`, background: stabilityColor }"></span
          ></span>
          <strong>{{ Number.isFinite(stability) ? Math.round(stability) : '--' }}/100</strong>
        </div>
      </section>

      <PowerStandoff :data="data" />

      <section class="forces panel-section">
        <div class="section-title">执政联盟与政治势力</div>
        <div class="coalition-line">
          <span class="muted">执政联盟：</span>
          <span v-if="coalition.length === 0" class="empty-inline">无</span>
          <span v-for="item in coalition" :key="item" class="coalition-chip">{{ item }}</span>
        </div>
        <div class="force-list">
          <PoliticalForceRow v-for="[name, force] in forces" :key="name" :name="name" :force="force" />
          <div v-if="forces.length === 0" class="empty-box">暂无活跃政治势力，政治格局尚未形成</div>
        </div>
      </section>

      <section class="ministers panel-section">
        <div class="section-title">
          <span>阁僚一览</span>
          <span class="count-chip">{{ ministerCount }} 席</span>
        </div>
        <div class="minister-list">
          <MinisterRow
            v-if="pmEntry"
            position="内阁总理大臣"
            :minister="pmEntry"
            @open="openMinister('内阁总理大臣', pmEntry)"
          />
          <MinisterRow
            v-for="[position, minister] in ministers"
            :key="position"
            :position="position"
            :minister="minister"
            @open="openMinister(position, minister)"
          />
          <div v-if="ministers.length === 0 && !pmEntry" class="empty-box">暂无阁僚</div>
        </div>
      </section>

      <section class="policies panel-section">
        <div class="section-title">当前政策</div>
        <div v-if="policies.length === 0" class="policy-empty">
          暂无活跃政策
          <button type="button" @click="emit('navigate', 'policy')">→ 去「政策追踪」Tab 查看</button>
        </div>
        <div v-else class="policy-list">
          <div class="policy-count">{{ policies.length }} 项活跃政策</div>
          <div v-for="[name, policy] in policies.slice(0, 3)" :key="name" class="policy-item">
            <span class="policy-name">{{ policy.内容 || name }}</span>
            <span class="status-stamp" :style="chipStyle(policy.推行状态, 'policy')">{{
              policy.推行状态 || '--'
            }}</span>
            <span class="effect">{{ policy.效果评估 || '--' }}</span>
          </div>
          <button type="button" class="policy-link" @click="emit('navigate', 'policy')">
            → 去「政策追踪」Tab 查看全部
          </button>
        </div>
      </section>

      <MinisterDetail
        v-if="selectedMinister"
        :position="selectedMinister.position"
        :minister="selectedMinister.minister"
        @close="selectedMinister = null"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import type { MvuData } from '../../2039_mvu/types';
import { useDataStore } from './store';
import PoliticalForceRow from './政治势力行.vue';
import PowerStandoff from './权力对峙条.vue';
import MinisterRow from './阁僚行.vue';
import MinisterDetail from './阁僚详情卡片.vue';

const emit = defineEmits<{
  navigate: ['policy' | 'characters'];
}>();

type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];
type Force = MvuData['日本执政']['主要政治势力'][string];
type Policy = MvuData['日本执政']['当前政策'][string];

const store = useDataStore();
const data = computed(() => store.data as MvuData);
const cabinet = computed(() => data.value.日本执政);
const innerCabinet = computed(() => cabinet.value.本届内阁);
const hasData = computed(() => Object.keys(data.value).length > 0 && !!data.value.日本执政);

const coalition = computed(() => innerCabinet.value?.执政联盟 ?? []);
const coalitionText = computed(() => (coalition.value.length > 0 ? coalition.value.join(' / ') : '无'));
const primeMinisterText = computed(() => {
  const name = cabinet.value?.首相姓名;
  const status = cabinet.value?.首相状态;
  if (name && status) return `${name}（${status}）`;
  return name || status || '空位';
});

const ministers = computed<[string, Minister][]>(
  () => Object.entries(innerCabinet.value?.主要阁僚 ?? {}) as [string, Minister][],
);
const pmEntry = computed<Minister | null>(() => {
  const name = cabinet.value?.首相姓名;
  if (!name) return null;
  const status = cabinet.value?.首相状态;
  const dutyMap: Record<string, string> = { 在任: '正常履职', 新任: '正常履职', 看守: '敷衍了事' };
  return {
    姓名: name,
    年龄: 0,
    原身份: '内阁总理大臣',
    政治立场: innerCabinet.value?.首相政治立场 || '不确定',
    对职务理解度: '专家',
    实际履职状态: (dutyMap[status ?? ''] || '正常履职') as Minister['实际履职状态'],
    幕后操控者: '',
    操控程度: 0,
    被操控方式: '',
    对官僚体系的影响力: 80,
    影响力来源: '首相职权',
    与官僚体系的争斗状态: '无争斗（完全服从）',
    官僚体系的应对: '',
    对当前职位的态度: '认真对待',
    当前心理状态: '',
    更关心的事: '',
    忠诚度: 100,
    暗杀威胁等级: '无',
    人身安全状况: status === '空位' ? '已流亡' : '有安保',
  } as Minister;
});
const ministerCount = computed(() => ministers.value.length + (pmEntry.value ? 1 : 0));
const forces = computed<[string, Force][]>(
  () => Object.entries(cabinet.value?.主要政治势力 ?? {}) as [string, Force][],
);
const policies = computed<[string, Policy][]>(
  () => Object.entries(cabinet.value?.当前政策 ?? {}) as [string, Policy][],
);

const stability = computed(() => safeNumber(innerCabinet.value?.内阁稳定度));
const stabilityColor = computed(() => {
  const value = stability.value;
  if (value >= 70) return '#22c55e';
  if (value >= 50) return '#eab308';
  if (value >= 30) return '#f97316';
  return '#ef4444';
});

const selectedMinister = ref<{ position: string; minister: Minister } | null>(null);

const InfoTile = defineComponent({
  name: 'InfoTile',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(tileProps) {
    return () =>
      h('div', { class: 'info-tile' }, [
        h('span', { class: 'tile-label' }, tileProps.label),
        h('strong', { class: 'tile-value' }, tileProps.value),
      ]);
  },
});

function openMinister(position: string, minister: Minister) {
  if (minister.人身安全状况 === '已死亡') return;
  selectedMinister.value = { position, minister };
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function chipStyle(value: string, kind: 'pm' | 'stance' | 'policy') {
  const pm: Record<string, string> = { 空位: '#ef4444', 看守: '#f97316', 新任: '#eab308', 在任: '#22c55e' };
  const stance: Record<string, string> = {
    极右翼: '#ef4444',
    右翼: '#f97316',
    中间偏右: '#eab308',
    中间: '#64748b',
    中间偏左: '#3b82f6',
    左翼: '#22c55e',
    不确定: '#9ca3af',
  };
  const policy: Record<string, string> = {
    提案中: '#94a3b8',
    审议中: '#3b82f6',
    已通过待执行: '#22c55e',
    执行中: '#eab308',
    受阻: '#ef4444',
    搁置: '#64748b',
    废除: '#ef4444',
    已完成: '#22c55e',
  };
  const color = (kind === 'pm' ? pm[value] : kind === 'stance' ? stance[value] : policy[value]) ?? '#64748b';
  return { borderColor: color, color };
}
</script>

<style scoped lang="scss">
.cabinet-panel {
  display: grid;
  gap: 10px;
}

.cabinet-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.48);

  h2 {
    margin: 2px 0 0;
    color: #f8fafc;
    font-size: 17px;
    letter-spacing: 0.08em;
  }
}

.eyebrow {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

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

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
}

:deep(.info-tile) {
  min-width: 0;
  padding: 8px;
  border-left: 3px solid rgba(59, 130, 246, 0.75);
  background: rgba(2, 6, 23, 0.28);
}

:deep(.tile-label) {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
}

:deep(.tile-value) {
  display: block;
  color: #e2e8f0;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stability-line {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 50px;
  align-items: center;
  gap: 8px;
  padding: 0 10px 11px;
  color: #94a3b8;
  font-size: 12px;
}

.stability-track {
  height: 7px;
  overflow: hidden;
  background: rgba(51, 65, 85, 0.7);

  span {
    display: block;
    height: 100%;
    transition: width 0.3s ease;
  }
}

.status-stamp,
.count-chip,
.coalition-chip {
  flex-shrink: 0;
  padding: 2px 7px;
  border-left: 2px solid;
  background: rgba(2, 6, 23, 0.45);
  font-size: 12px;
  font-weight: 900;
}

.coalition-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 10px 0;
  font-size: 12px;
}

.muted,
.empty-inline {
  color: #64748b;
}

.coalition-chip {
  border-color: #3b82f6;
  color: #bfdbfe;
}

.force-list,
.minister-list,
.policy-list {
  display: grid;
  gap: 6px;
  padding: 10px;
}

.empty-box,
.policy-empty {
  padding: 14px 10px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.policy-empty button,
.policy-link {
  margin-left: 6px;
  border: none;
  background: transparent;
  color: #60a5fa;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.policy-count {
  color: #94a3b8;
  font-size: 12px;
}

.policy-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(2, 6, 23, 0.25);
  font-size: 12px;
}

.policy-name {
  min-width: 0;
  color: #e2e8f0;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.effect {
  color: #94a3b8;
}

.skeleton-cabinet {
  display: grid;
  gap: 10px;
}

.skeleton-block {
  height: 32px;
  border-radius: 4px;
  background: linear-gradient(90deg, #1e293b, #334155, #1e293b);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.w60 {
  width: 60%;
}
.h60 {
  height: 60px;
}
.h84 {
  height: 84px;
}
.h120 {
  height: 120px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@container main-panel (max-width: 430px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }

  .cabinet-header {
    align-items: center;
  }

  .policy-item {
    grid-template-columns: 1fr;
    gap: 5px;
  }
}
</style>
