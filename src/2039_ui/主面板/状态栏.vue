<template>
  <div class="status-bar" @click="emit('click')">
    <div class="status-row-1">
      <span class="phase-tag placeholder">政治阶段</span>
      <span class="pm-tag placeholder">首相：--</span>
      <span class="crisis-tag placeholder">危机：--</span>
    </div>
    <div class="status-row-2">
      <span class="secondary-tag">稳定度 --</span>
      <span class="secondary-tag">外压 --</span>
      <span class="secondary-tag">合法性 --</span>
      <span class="secondary-tag">控制力 --</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.status-bar {
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
}

.status-row-1 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.status-row-2 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 4px;
}

.phase-tag,
.pm-tag,
.crisis-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.phase-tag {
  background: #fee2e2;
  color: #dc2626;
}

.pm-tag {
  background: #e0e7ff;
  color: #4f46e5;
}

.crisis-tag {
  background: #fef3c7;
  color: #d97706;
}

.secondary-tag {
  padding: 1px 6px;
  border-radius: 3px;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 11px;
  white-space: nowrap;
}

// 手机端：只显示第一行，第二行折叠
@container main-panel (max-width: 430px) {
  .status-row-2 {
    display: none;
  }
}
</style>
