<template>
  <div class="main-panel">
    <StatusBar @click="toggleStatusBar" />

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: currentTab === tab.key }"
        @click="toggleTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <Transition name="slide-fade">
      <div v-show="expanded" class="tab-content">
        <div v-if="currentTab === 'cabinet'" class="placeholder">🏛️ 内阁面板 —— 待施工</div>
        <div v-else-if="currentTab === 'policy'" class="placeholder">📋 政策追踪 —— 待施工</div>
        <div v-else-if="currentTab === 'election'" class="placeholder">🗳️ 选举看板 —— 待施工</div>
        <div v-else-if="currentTab === 'crisis'" class="placeholder">⚠️ 危机仪表盘 —— 待施工</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import StatusBar from './状态栏.vue';

const tabs = [
  { key: 'cabinet', label: '内阁' },
  { key: 'policy', label: '政策' },
  { key: 'election', label: '选举' },
  { key: 'crisis', label: '危机' },
] as const;

const expanded = ref(false);
const currentTab = ref<'cabinet' | 'policy' | 'election' | 'crisis'>('cabinet');

const toggleTab = (tab: 'cabinet' | 'policy' | 'election' | 'crisis') => {
  if (currentTab.value === tab) {
    expanded.value = !expanded.value;
  } else {
    currentTab.value = tab;
    expanded.value = true;
  }
};

const toggleStatusBar = () => {
  if (expanded.value) {
    expanded.value = false;
  }
};
</script>

<style lang="scss" scoped>
.main-panel {
  container-type: inline-size;
  container-name: main-panel;
  width: 100%;
}

.tab-bar {
  display: flex;
  overflow-x: auto;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid #e5e7eb;

  button {
    flex-shrink: 0;
    min-width: 44px;
    min-height: 44px;
    padding: 6px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f9fafb;
    color: #6b7280;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
      font-weight: 600;
    }

    &:hover {
      background: #e5e7eb;
    }

    &.active:hover {
      background: #2563eb;
    }
  }
}

.tab-content {
  padding: 12px 8px;
}

.placeholder {
  padding: 24px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-fade-enter-active {
  transition: all 0.2s ease;
}
.slide-fade-leave-active {
  transition: all 0.15s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.slide-fade-leave-to {
  opacity: 0;
}

// 手机端
@container main-panel (max-width: 430px) {
  .tab-bar {
    padding: 4px 4px;
    gap: 2px;

    button {
      min-width: 40px;
      min-height: 40px;
      padding: 4px 10px;
      font-size: 12px;
    }
  }

  .tab-content {
    padding: 8px 4px;
  }
}
</style>
