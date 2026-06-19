<template>
  <div class="status-panel">
    <article class="dossier-shell">
      <WorldSection />
      <BaseVehicleBar />

      <section class="dossier-body" aria-live="polite">
        <header class="section-header">
          <div class="seal">{{ activeTabMeta?.icon ?? '▣' }}</div>
          <div>
            <p class="section-kicker">{{ sectionKicker }}</p>
            <h2>{{ activeTabMeta?.label ?? activeTab }}</h2>
          </div>
        </header>

        <div class="summary-card">
          <span class="summary-label">本页摘要</span>
          <p>{{ placeholderText }}</p>
        </div>

        <div class="paper-card">
          <div class="paper-line"></div>
          <p class="paper-title">{{ activeTabMeta?.label ?? activeTab }}案卷</p>
          <p class="paper-text">
            后续阶段会在此处接入对应详情组件。当前布局已改为手机优先的案卷正文区：顶部是世界与基地车简报，底部是固定菜单，正文只展示当前案卷。
          </p>
        </div>
      </section>

      <TabNav v-model="activeTab" :tabs="visibleTabs" />
    </article>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';
import BaseVehicleBar from './components/BaseVehicleBar.vue';
import TabNav from './components/TabNav.vue';
import WorldSection from './components/WorldSection.vue';
import { useDataStore } from './store';

const store = useDataStore();

type TabItem = {
  id: string;
  label: string;
  icon: string;
};

const coreTabs: TabItem[] = [
  { id: '科技', label: '科技', icon: '🔬' },
  { id: '组织', label: '组织', icon: '🏛️' },
  { id: '军事', label: '军事', icon: '⚔️' },
  { id: '角色', label: '角色', icon: '👥' },
  { id: '外部', label: '外部', icon: '🌐' },
  { id: '情报', label: '情报', icon: '🕵️' },
  { id: '事件', label: '事件', icon: '⚠️' },
];

const optionalTabs = computed<TabItem[]>(() => {
  const tabs: TabItem[] = [];
  if (_.has(store.data, '组织结构.财政')) tabs.push({ id: '财政', label: '财政', icon: '💰' });
  if (_.has(store.data, '组织结构.行政区划')) tabs.push({ id: '区划', label: '区划', icon: '🗺️' });
  if (_.has(store.data, '组织结构.人事')) tabs.push({ id: '人事', label: '人事', icon: '📋' });
  return tabs;
});

const visibleTabs = computed(() => [...coreTabs, ...optionalTabs.value]);
const activeTab = useLocalStorage<string>('群友群穿:status_bar:active_tab', '科技');
const activeTabMeta = computed(() => visibleTabs.value.find(tab => tab.id === activeTab.value));
const sectionKicker = computed(
  () =>
    `案卷 ${Math.max(1, visibleTabs.value.findIndex(tab => tab.id === activeTab.value) + 1)} / ${visibleTabs.value.length}`,
);
const placeholderText = computed(() => `${activeTab.value}面板将在后续阶段继续施工。当前阶段 5.1 仅搭建可加载框架。`);
</script>

<style lang="scss" scoped>
.status-panel {
  width: 100%;
  padding: 6px 6px 0;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
}

.dossier-shell {
  overflow: hidden;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 16px 16px 0 0;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139, 119, 90, 0.04) 2px,
      rgba(139, 119, 90, 0.04) 4px
    ),
    radial-gradient(
      ellipse 90% 70% at 50% 30%,
      var(--qyc-paper-light) 0%,
      var(--qyc-paper) 55%,
      var(--qyc-paper-dark) 100%
    );
  box-shadow:
    0 4px 24px rgba(44, 24, 16, 0.14),
    inset 0 0 60px rgba(139, 119, 90, 0.08);
}

.dossier-body {
  padding: 14px 12px 86px;
}

.section-header {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.seal {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border: 2px solid var(--qyc-vermilion);
  border-radius: 10px;
  background: var(--qyc-paper-light);
  box-shadow:
    inset 0 0 0 2px var(--qyc-paper-light),
    0 0 0 1px var(--qyc-vermilion-faded);
  color: var(--qyc-vermilion);
  font-size: 23px;
}

.section-kicker {
  margin: 2px 0 3px;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.section-header h2 {
  margin: 0;
  font-size: 21px;
  letter-spacing: 0.04em;
}

.summary-card,
.paper-card {
  border: 1px solid var(--qyc-line);
  border-radius: 10px;
  background: var(--qyc-paper-light);
  padding: 12px;
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.summary-card {
  margin-bottom: 10px;
}

.summary-label {
  display: inline-flex;
  margin-bottom: 6px;
  border: 1px solid var(--qyc-vermilion);
  border-radius: 999px;
  color: var(--qyc-vermilion);
  font-size: 13px;
  padding: 3px 10px;
}

.summary-card p,
.paper-text {
  margin: 0;
  color: var(--qyc-ink-dim);
  font-size: 15px;
  line-height: 1.55;
}

.paper-card {
  position: relative;
  min-height: 148px;
}

.paper-line {
  height: 1px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, transparent, var(--qyc-vermilion), transparent);
}

.paper-title {
  margin: 0 0 8px;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-weight: 800;
  font-size: 18px;
}
</style>
