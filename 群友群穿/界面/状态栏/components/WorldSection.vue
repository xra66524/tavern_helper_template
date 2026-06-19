<template>
  <header class="world-section">
    <div class="title-row">
      <div>
        <span class="eyebrow">QUNYOU CROSSING</span>
        <h1>群友群穿状态栏</h1>
      </div>
      <span class="live-badge">LIVE</span>
    </div>

    <div class="meta-grid">
      <span>📅 {{ world.当前日期 || '----.--.--' }}</span>
      <span>🕐 {{ world.当前时间 || '--:--' }}</span>
      <span>⏳ 第 {{ store.data.$穿越天数 ?? '--' }} 天</span>
      <span>阶段：{{ world.政治阶段 || '--' }}</span>
    </div>

    <div class="event-row">
      <span class="event-label">当前大事件</span>
      <span class="event-text">{{ world.当前大事件 || '暂无' }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '../store';

const store = useDataStore();
const world = computed(() => store.data.世界);
</script>

<style lang="scss" scoped>
.world-section {
  padding: 12px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.eyebrow {
  color: var(--qyc-vermilion-faded);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
}

h1 {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 1.2;
  font-family: var(--qyc-font-title);
  letter-spacing: 0.06em;
}

.live-badge {
  border: 2px solid var(--qyc-ok);
  border-radius: 999px;
  color: var(--qyc-ok);
  font-family: var(--qyc-font-mono);
  font-size: 13px;
  padding: 3px 10px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 6px;
  color: var(--qyc-ink);
  font-size: 14px;
}

.event-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
  border-top: 1px dashed var(--qyc-line-strong);
  padding-top: 10px;
}

.event-label,
.meeting-badge {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  color: var(--qyc-ink-dim);
  font-size: 14px;
  padding: 4px 10px;
}

.meeting-badge.active {
  border-color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-vermilion);
}

.event-text {
  flex: 1 1 220px;
  color: var(--qyc-ink);
  font-size: 15px;
}
</style>
