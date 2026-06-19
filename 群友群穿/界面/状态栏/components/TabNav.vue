<template>
  <nav class="tab-nav" aria-label="群友群穿状态栏底部菜单">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="tab-button"
      :class="{ active: model === tab.id }"
      :aria-current="model === tab.id ? 'page' : undefined"
      @click="model = tab.id"
    >
      <span class="tab-icon">{{ tab.icon }}</span>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  tabs: { id: string; label: string; icon: string }[];
}>();

const model = defineModel<string>({ required: true });
</script>

<style lang="scss" scoped>
.tab-nav {
  position: sticky;
  z-index: 5;
  bottom: 0;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-top: 1px solid var(--qyc-line-strong);
  background: linear-gradient(180deg, var(--qyc-paper-warm), var(--qyc-paper-dark));
  padding: 7px 8px 8px;
  scrollbar-width: none;
}

.tab-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  display: inline-flex;
  flex: 1 0 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 58px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--qyc-ink-dim);
  cursor: pointer;
  padding: 7px 6px 6px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.tab-button:hover {
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-ink);
}

.tab-button.active {
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  box-shadow: 0 1px 3px rgba(44, 24, 16, 0.1);
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-label {
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
}
</style>
