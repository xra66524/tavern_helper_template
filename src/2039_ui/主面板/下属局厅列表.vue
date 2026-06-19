<template>
  <div class="bureau-list">
    <div class="bureau-divider"></div>
    <!-- 活跃局厅 -->
    <div v-for="bureau in activeBureaus" :key="bureau" class="bureau-item active" @click="toggleBureauDetail(bureau)">
      <span class="bureau-arrow">▸</span>
      <span class="bureau-name">{{ bureau }}</span>
      <!-- 局厅描述展开 -->
      <Transition name="fold">
        <div v-if="expandedBureau === bureau && bureauDescriptions[bureau]" class="bureau-desc">
          {{ bureauDescriptions[bureau] }}
        </div>
      </Transition>
    </div>
    <div v-if="activeBureaus.length === 0" class="bureau-empty">暂无活跃局厅</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  ministryName: string;
  activeBureaus: string[];
}>();

const expandedBureau = ref<string | null>(null);

/** 局厅描述（从省厅与下属机构扩展数据读取，目前为空对象） */
const bureauDescriptions = ref<Record<string, string>>({});

function toggleBureauDetail(bureau: string) {
  expandedBureau.value = expandedBureau.value === bureau ? null : bureau;
}
</script>

<style scoped lang="scss">
.bureau-list {
  padding: 4px 0 2px 12px;
}

.bureau-divider {
  height: 1px;
  margin-bottom: 6px;
  background: rgba(148, 163, 184, 0.1);
}

.bureau-item {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  padding: 3px 0;
  font-size: 12px;

  &.active {
    cursor: pointer;

    &:hover .bureau-name {
      color: #60a5fa;
    }
  }
}

.bureau-arrow {
  color: #60a5fa;
  font-weight: 900;
}

.bureau-name {
  color: #cbd5e1;
  font-weight: 800;
  transition: color 0.15s ease;
}

.bureau-empty {
  color: #64748b;
  font-size: 11px;
  font-style: italic;
  padding: 2px 0;
}

.bureau-desc {
  width: 100%;
  padding: 3px 0 3px 16px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.4;
}

// ── 折叠过渡 ──
.fold-enter-active,
.fold-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  max-height: 0;
  opacity: 0;
}

.fold-enter-to,
.fold-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>
