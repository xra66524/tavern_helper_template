<template>
  <header class="world-section">
    <div class="title-row">
      <div>
        <span class="eyebrow">QUNYOU CROSSING</span>
        <h1>群友群穿状态栏</h1>
      </div>
      <div class="title-actions">
        <button
          type="button"
          class="edit-toggle"
          :class="{ active: editing }"
          :title="editing ? '关闭编辑' : '编辑世界信息'"
          @click="editing = !editing"
        >
          {{ editing ? '✓ 完成' : '✎ 编辑' }}
        </button>
        <span class="live-badge">LIVE</span>
      </div>
    </div>

    <div class="meta-grid">
      <template v-if="!editing">
        <span>📅 {{ data.当前日期 || '----.--.--' }}</span>
        <span>🕐 {{ data.当前时间 || '--:--' }}</span>
        <span>⏳ 第 {{ store.data.$穿越天数 ?? '--' }} 天</span>
        <span>阶段：{{ data.政治阶段 || '--' }}</span>
      </template>
      <template v-else>
        <label class="edit-field">
          <span class="edit-label">📅 日期</span>
          <input v-model="data.当前日期" type="text" class="form-input" placeholder="YYYY-MM-DD" />
        </label>
        <label class="edit-field">
          <span class="edit-label">🕐 时间</span>
          <input v-model="data.当前时间" type="text" class="form-input" placeholder="HH:MM" />
        </label>
        <label class="edit-field">
          <span class="edit-label">⏳ 穿越天数</span>
          <span class="edit-static">{{ store.data.$穿越天数 ?? '--' }}（自动计算）</span>
        </label>
        <label class="edit-field">
          <span class="edit-label">阶段</span>
          <div class="edit-combo">
            <select v-model="data.政治阶段" class="form-select">
              <option value="" disabled>选择阶段…</option>
              <option v-for="opt in 政治阶段选项" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-model="政治阶段自定义" type="text" class="form-input" placeholder="或输入自定义值…" />
          </div>
        </label>
      </template>
    </div>

    <template v-if="!editing">
      <div class="event-row">
        <span class="event-label">当前大事件</span>
        <span class="event-text">{{ data.当前大事件 || '暂无' }}</span>
      </div>
      <div v-if="meeting" class="meeting-row">
        <span class="meeting-badge" :class="{ active: isMeetingActive }">🏛️ {{ meeting }}</span>
      </div>
    </template>
    <template v-else>
      <div class="event-row edit-row">
        <label class="edit-field edit-field--wide">
          <span class="edit-label">当前大事件</span>
          <input v-model="data.当前大事件" type="text" class="form-input" placeholder="请输入当前大事件…" />
        </label>
      </div>
      <div class="meeting-row edit-row">
        <label class="edit-field edit-field--wide">
          <span class="edit-label">🏛️ 当前会议</span>
          <input v-model="data.当前会议" type="text" class="form-input" placeholder="不填则隐藏；填「无」表示无会议" />
        </label>
      </div>
    </template>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 政治阶段参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store: any = useDataStore();
const data = computed(() => store.data?.世界);

const editing = ref(false);

const meeting = computed(() => data.value?.当前会议);
const isMeetingActive = computed(() => {
  const m = meeting.value;
  return !!m && m !== '无';
});

// ── 政治阶段编辑：select + custom input ──
const 政治阶段选项 = [...政治阶段参考列表];
const 政治阶段自定义 = ref('');

// 同步自定义输入与 data
watch(政治阶段自定义, val => {
  if (val && data.value) data.value.政治阶段 = val;
});

// 进入编辑模式时初始化自定义值
watch(editing, v => {
  if (v && data.value) {
    const cur = data.value.政治阶段 || '';
    政治阶段自定义.value = 政治阶段选项.includes(cur as any) ? '' : cur;
  }
});
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

.meeting-row {
  margin-top: 8px;
}

.meeting-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

/* ── 编辑模式 ── */
.title-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.edit-toggle {
  height: 28px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.edit-toggle:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.edit-toggle.active {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  background: rgba(74, 124, 63, 0.06);
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
}

.edit-field--wide {
  flex: 1;
}

.edit-label {
  color: var(--qyc-ink-faint);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.edit-static {
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 30px;
}

.edit-combo {
  display: flex;
  gap: 4px;
}

.edit-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--qyc-line-strong);
}

.form-input {
  height: 30px;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 13px;
  padding: 0 8px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--qyc-vermilion);
}

.form-select {
  height: 30px;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 13px;
  padding: 0 6px;
  outline: none;
  cursor: pointer;
  min-width: 100px;
}

.form-select:focus {
  border-color: var(--qyc-vermilion);
}
</style>
