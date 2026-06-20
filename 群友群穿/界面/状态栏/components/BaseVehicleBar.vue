<template>
  <section
    class="vehicle-bar"
    role="button"
    tabindex="0"
    aria-label="基地车状态条，点击查看详情"
    @click="emit('click')"
    @keydown.enter="emit('click')"
  >
    <div class="vehicle-main">
      <span class="vehicle-title">🚛 基地车</span>
      <span class="vehicle-location">{{ vehicle.当前位置 || '未知位置' }}</span>
      <span class="vehicle-state">{{ vehicle.移动状态 || '--' }}</span>
    </div>
    <div class="vehicle-tags">
      <span class="tag" :style="tagStyle(vehicle.反应堆状态)">⚛️ {{ vehicle.反应堆状态 || '--' }}</span>
      <span class="tag" :style="loadStyle">⚡ 负载 {{ vehicle.配电系统负载 ?? '--' }}%</span>
      <span class="tag">🦾 {{ vehicle.外骨骼现状 ?? '--' }}</span>
    </div>
    <span class="vehicle-hint" aria-hidden="true">详情 ›</span>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '../store';

const emit = defineEmits<{ click: [] }>();

const store = useDataStore();
const vehicle = computed(() => store.data.基地车);

function colorForStatus(status: string | undefined) {
  if (!status) return 'var(--qyc-ink-dim)';
  if (/正常|充足|满功率|驻扎/.test(status)) return 'var(--qyc-ok)';
  if (/紧张|降|过载|故障/.test(status)) return 'var(--qyc-warn)';
  if (/危急|损毁|耗尽|失控/.test(status)) return 'var(--qyc-danger)';
  return 'var(--qyc-ink-dim)';
}

function tagStyle(status: string | undefined) {
  const color = colorForStatus(status);
  return { borderColor: color, color };
}

const loadStyle = computed(() => {
  const load = vehicle.value.配电系统负载 ?? 0;
  const color = load >= 90 ? 'var(--qyc-danger)' : load >= 70 ? 'var(--qyc-warn)' : 'var(--qyc-ok)';
  return { borderColor: color, color };
});
</script>

<style lang="scss" scoped>
.vehicle-bar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--qyc-line);
  border-bottom: 1px solid var(--qyc-line);
  padding: 10px 12px;
  background: var(--qyc-paper-dark);
  cursor: pointer;
  transition: background 0.15s ease;
}

.vehicle-bar:hover,
.vehicle-bar:focus-visible {
  background: var(--qyc-paper-warm);
  outline: none;
}

.vehicle-main,
.vehicle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vehicle-title {
  font-weight: 800;
  font-size: 15px;
}

.vehicle-location,
.vehicle-state {
  color: var(--qyc-ink-dim);
  font-size: 14px;
}

.tag {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-mono);
  font-size: 13px;
  padding: 4px 9px;
  background: var(--qyc-paper-light);
}

.vehicle-hint {
  color: var(--qyc-vermilion-faded);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
}
</style>
