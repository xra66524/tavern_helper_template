<template>
  <div class="force-row" :title="tooltip">
    <div class="force-main">
      <span class="force-name">{{ force.势力名 || name }}</span>
      <span class="type-chip" :style="chipStyle(force.类型)">{{ force.类型 || '--' }}</span>
      <span
        v-if="force.武装力量等级 && force.武装力量等级 !== '无'"
        class="armed"
        :class="{ pulse: force.武装力量等级 === '极高' }"
        >⌁ {{ force.武装力量等级 }}</span
      >
    </div>
    <div class="force-meta">
      <span>支持 {{ supportText }}</span>
      <span class="attitude csat">CSAT {{ signed(force.对CSAT态度) }}</span>
      <span class="attitude usa">美 {{ signed(force.对美态度) }}</span>
    </div>
    <div class="support-track"><span :style="{ width: `${support}%` }"></span></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MvuData } from '../../2039_mvu/types';

type Force = MvuData['日本执政']['主要政治势力'][string];

const props = defineProps<{
  name: string;
  force: Force;
}>();

const support = computed(() => safeNumber(props.force.支持度));
const supportText = computed(() =>
  typeof props.force.支持度 === 'number' ? `${Math.round(props.force.支持度)}%` : '--',
);
const tooltip = computed(() => `核心诉求：${props.force.核心诉求 || '--'}\n当前策略：${props.force.当前策略 || '--'}`);

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function signed(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${Math.round(value)}` : '--';
}

function chipStyle(value: string) {
  const map: Record<string, string> = {
    政党: '#3b82f6',
    武装团体: '#ef4444',
    官僚系统: '#8b5cf6',
    灰色势力: '#64748b',
    地方豪强: '#06b6d4',
    外部势力代理人: '#f97316',
    民间团体: '#22c55e',
  };
  const color = map[value] ?? '#64748b';
  return { borderColor: color, color };
}
</script>

<style scoped lang="scss">
.force-row {
  padding: 8px 9px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(2, 6, 23, 0.25);
  transition:
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.28);
    background: rgba(15, 23, 42, 0.55);
  }
}

.force-main,
.force-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.force-main {
  margin-bottom: 5px;
}

.force-name {
  min-width: 0;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-chip,
.armed,
.attitude {
  flex-shrink: 0;
  padding: 1px 5px;
  border-left: 2px solid;
  background: rgba(15, 23, 42, 0.68);
  font-size: 11px;
  font-weight: 800;
}

.armed {
  border-color: #f97316;
  color: #fed7aa;
}

.armed.pulse {
  color: #fecaca;
  border-color: #ef4444;
  animation: pulse-red 1.4s ease-in-out infinite;
}

.force-meta {
  color: #64748b;
  font-size: 12px;
}

.csat {
  border-color: #f97316;
  color: #fdba74;
}

.usa {
  border-color: #3b82f6;
  color: #93c5fd;
}

.support-track {
  height: 4px;
  margin-top: 6px;
  overflow: hidden;
  background: rgba(51, 65, 85, 0.7);

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e);
    transition: width 0.3s ease;
  }
}

@keyframes pulse-red {
  0%,
  100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}
</style>
