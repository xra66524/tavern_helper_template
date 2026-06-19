<template>
  <button class="minister-row" :class="rowClass" type="button" :disabled="isDead" @click="emit('open')">
    <span class="threat-icon" :style="{ color: threatColor }">{{ threatIcon }}</span>
    <span class="position-icon">{{ positionIcon }}</span>
    <span class="position-name">{{ shortPosition }}</span>
    <span class="minister-name" :style="{ borderColor: stanceColor }">{{ minister.姓名 || '空位' }}</span>
    <span class="control-mark" :title="controlTitle">{{ controlMark }}</span>
    <span class="status-chip understand" :style="chipStyle(minister.对职务理解度, 'understand')">{{
      minister.对职务理解度 || '--'
    }}</span>
    <span class="status-chip duty" :style="chipStyle(minister.实际履职状态, 'duty')">{{
      minister.实际履职状态 || '--'
    }}</span>
    <span class="life-mark">{{ lifeIcon }}</span>
    <span class="arrow">{{ isDead ? '' : '▸' }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MvuData } from '../../2039_mvu/types';

type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];

const props = defineProps<{
  position: string;
  minister: Minister;
}>();

const emit = defineEmits<{
  open: [];
}>();

const isDead = computed(() => props.minister.人身安全状况 === '已死亡');
const rowClass = computed(() => ({
  threatened: props.minister.人身安全状况 === '受到威胁',
  attacked: props.minister.人身安全状况 === '已遇袭',
  dead: props.minister.人身安全状况 === '已死亡',
  exiled: props.minister.人身安全状况 === '已流亡',
}));

const shortPosition = computed(() =>
  props.position
    .replace(/大臣/g, '相')
    .replace(/長官/g, '官')
    .replace(/委員長/g, '委'),
);
const positionIcon = computed(() => {
  const p = props.position;
  if (p.includes('首相') || p.includes('总理')) return '👑';
  if (p.includes('外务')) return '🌐';
  if (p.includes('防卫') || p.includes('防衛')) return '🛡️';
  if (p.includes('财务') || p.includes('財務')) return '💰';
  if (p.includes('法务') || p.includes('法務')) return '⚖️';
  if (p.includes('经济') || p.includes('経済') || p.includes('产业') || p.includes('産業')) return '📈';
  if (p.includes('农林') || p.includes('農林') || p.includes('水产') || p.includes('水産')) return '🌾';
  if (p.includes('总务') || p.includes('総務')) return '📋';
  if (p.includes('文部') || p.includes('科学') || p.includes('教育')) return '📚';
  if (p.includes('厚生') || p.includes('劳动') || p.includes('労働') || p.includes('福祉')) return '🏥';
  if (p.includes('国土') || p.includes('交通')) return '🚄';
  if (p.includes('环境') || p.includes('環境')) return '🌿';
  if (p.includes('内阁') || p.includes('内閣') || p.includes('官房')) return '🏯';
  if (p.includes('公安') || p.includes('警察')) return '🚔';
  if (p.includes('数字') || p.includes('デジタル') || p.includes('情報')) return '💻';
  if (p.includes('复兴') || p.includes('復興')) return '🔧';
  if (p.includes('冲绳') || p.includes('沖縄') || p.includes('北方')) return '🏝️';
  return '🏛️';
});

const threatIcon = computed(() => {
  const map: Record<string, string> = { 无: '', 低: '🟢', 中: '🟡', 高: '🔴', 极高: '💀' };
  return map[props.minister.暗杀威胁等级] ?? '';
});
const threatColor = computed(() => {
  const map: Record<string, string> = { 无: '#64748b', 低: '#22c55e', 中: '#eab308', 高: '#ef4444', 极高: '#7f1d1d' };
  return map[props.minister.暗杀威胁等级] ?? '#64748b';
});

const stanceColor = computed(() => {
  const map: Record<string, string> = {
    极右翼: '#ef4444',
    右翼: '#f97316',
    中间偏右: '#eab308',
    中间: '#64748b',
    中间偏左: '#3b82f6',
    左翼: '#22c55e',
    不确定: '#9ca3af',
  };
  return map[props.minister.政治立场] ?? '#9ca3af';
});

const controlMark = computed(() => {
  const value = props.minister.操控程度;
  if (typeof value !== 'number') return '';
  if (value > 70) return '🔗';
  if (value > 30) return '•';
  return '';
});

const controlTitle = computed(
  () => `操控者：${props.minister.幕后操控者 || '--'}；方式：${props.minister.被操控方式 || '--'}`,
);
const lifeIcon = computed(() => {
  const map: Record<string, string> = { 安全: '', 有安保: '🔵', 受到威胁: '⚠', 已遇袭: '⛑', 已死亡: '☠', 已流亡: '✈' };
  return map[props.minister.人身安全状况] ?? '';
});

function chipStyle(value: string, kind: 'understand' | 'duty') {
  const understand: Record<string, string> = {
    专家: '#22c55e',
    熟练: '#22c55e',
    勉强理解: '#eab308',
    一知半解: '#f97316',
    完全不懂: '#ef4444',
  };
  const duty: Record<string, string> = {
    正常履职: '#22c55e',
    敷衍了事: '#eab308',
    被架空: '#eab308',
    恐慌中: '#f97316',
    逃避职责: '#f97316',
    完全摆烂: '#ef4444',
  };
  const color = kind === 'understand' ? understand[value] : duty[value];
  return { borderColor: color ?? '#64748b', color: color ?? '#94a3b8' };
}
</script>

<style scoped lang="scss">
.minister-row {
  display: grid;
  grid-template-columns:
    24px 24px minmax(70px, 1.05fr) minmax(70px, 0.95fr) 20px minmax(68px, 0.75fr) minmax(68px, 0.75fr)
    20px 16px;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(2, 6, 23, 0.2);
  color: #cbd5e1;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: rgba(59, 130, 246, 0.32);
    background: rgba(15, 23, 42, 0.62);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.threat-icon,
.position-icon,
.life-mark,
.arrow,
.control-mark {
  text-align: center;
  font-weight: 900;
}

.position-name,
.minister-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.position-name {
  color: #94a3b8;
  font-weight: 800;
}

.minister-name {
  padding-left: 6px;
  border-left: 2px solid #64748b;
  color: #f8fafc;
  font-weight: 900;
}

.status-chip {
  min-width: 0;
  padding: 2px 5px;
  border-left: 2px solid;
  background: rgba(15, 23, 42, 0.68);
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  color: #64748b;
}

.threatened .minister-name::after {
  content: ' ⚠';
  color: #eab308;
}

.attacked {
  background: rgba(249, 115, 22, 0.1);
}

.dead {
  opacity: 0.48;
  filter: grayscale(0.7);

  .minister-name,
  .position-name {
    text-decoration: line-through;
  }
}

.exiled {
  opacity: 0.62;
  font-style: italic;
}

@container main-panel (max-width: 430px) {
  .minister-row {
    grid-template-columns: 20px 20px minmax(64px, 1fr) minmax(68px, 1fr) 18px 18px;
    gap: 4px;
  }

  .status-chip {
    grid-row: 2;
    font-size: 11px;
  }

  .understand {
    grid-column: 3 / 4;
  }

  .duty {
    grid-column: 4 / 5;
  }

  .life-mark {
    grid-column: 5 / 6;
  }

  .arrow {
    grid-column: 6 / 7;
  }
}
</style>
