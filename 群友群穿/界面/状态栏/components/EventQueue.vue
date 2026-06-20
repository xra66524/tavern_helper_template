<template>
  <div class="event-panel">
    <div class="watermark" aria-hidden="true">CASE FILE</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">EVENT QUEUE</p>
        <h3>⚠️ 事件队列</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <section class="event-section">
      <div class="sub-header">
        <h4>近期已发生事件</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addRecent">＋ 事件</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <ol v-if="recentEvents.length" class="timeline">
        <li v-for="(event, index) in recentEvents" :key="index" class="timeline-item">
          <div class="timeline-rail">
            <span class="time-diamond">◆</span>
            <span v-if="index < recentEvents.length - 1" class="rail-line"></span>
          </div>
          <div class="event-card">
            <div class="event-title-row">
              <span class="case-no">№ {{ String(index + 1).padStart(3, '0') }}</span>
              <input v-if="editing" v-model="event.时间" type="text" class="form-input time-input" placeholder="时间" />
              <time v-else>{{ event.时间 || '未知时间' }}</time>
              <button v-if="editing" type="button" class="danger-btn" @click="recentEvents.splice(index, 1)">✕</button>
            </div>
            <textarea v-if="editing" v-model="event.事件" class="form-textarea" rows="2" placeholder="事件"></textarea>
            <strong v-else>{{ event.事件 || '未命名事件' }}</strong>
            <label class="impact-field">
              <span>影响</span>
              <textarea v-if="editing" v-model="event.影响" class="form-textarea" rows="2"></textarea>
              <span v-else class="impact-pill" :class="impactClass(event.影响)">{{ event.影响 || '待评估' }}</span>
            </label>
          </div>
        </li>
      </ol>
      <div v-else class="empty-hint">暂无已发生事件</div>
    </section>

    <section class="event-section crisis-section">
      <div class="sub-header">
        <h4>潜在危机</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addCrisis">＋ 危机</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="crises.length" class="crisis-list">
        <article
          v-for="(crisis, index) in crises"
          :key="index"
          class="crisis-card"
          :class="severityClass(crisis.严重程度)"
        >
          <div class="crisis-alarm" :class="severityClass(crisis.严重程度)">
            <span class="alarm-dot">{{ severityDot(crisis.严重程度) }}</span>
            <span class="alarm-label">危机等级 · {{ crisis.严重程度 || '未知' }}</span>
          </div>
          <div class="crisis-top">
            <textarea v-if="editing" v-model="crisis.危机" class="form-textarea" rows="2" placeholder="危机"></textarea>
            <strong v-else>{{ crisis.危机 || '未命名危机' }}</strong>
            <button v-if="editing" type="button" class="danger-btn" @click="crises.splice(index, 1)">✕</button>
          </div>
          <label class="trigger-field">
            <span>⚠️ 触发条件</span>
            <textarea v-if="editing" v-model="crisis.触发条件" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ crisis.触发条件 || '未知' }}</p>
          </label>
          <label class="severity-field">
            <span>严重程度</span>
            <select v-if="editing" v-model="crisis.严重程度" class="form-select">
              <option v-for="opt in 严重程度选项" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <b v-else>{{ crisis.严重程度 || '未知' }}</b>
          </label>
        </article>
      </div>
      <div v-else class="empty-hint">暂无潜在危机</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 危机严重程度参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);

watch(
  () => store.data,
  data => {
    data.事件队列 ??= { 近期已发生事件: [], 潜在危机: [] };
    data.事件队列.近期已发生事件 ??= [];
    data.事件队列.潜在危机 ??= [];
  },
  { immediate: true, once: true },
);
const 事件队列 = computed<any>(() => store.data.事件队列 ?? {});
const recentEvents = computed<any[]>(() => 事件队列.value.近期已发生事件);
const crises = computed<any[]>(() => 事件队列.value.潜在危机);
const 严重程度选项 = [...危机严重程度参考列表];

function addRecent() {
  recentEvents.value.push({
    事件: '新事件',
    时间: store.data?.世界?.当前日期 || '1905-05-10',
    影响: '待评估',
  });
}

function addCrisis() {
  crises.value.push({
    危机: '新危机',
    触发条件: '待设定',
    严重程度: '中',
  });
}

function severityClass(value: string): string {
  if (value === '极高') return 'critical';
  if (value === '高') return 'high';
  if (value === '中') return 'medium';
  return 'low';
}

function severityDot(value: string): string {
  if (value === '极高') return '🔴';
  if (value === '高') return '🟠';
  if (value === '中') return '🟡';
  return '🔵';
}

function impactClass(value: string): string {
  const text = String(value || '');
  if (/正面|增益|成功|提升|有利|稳定/.test(text)) return 'positive';
  if (/负面|损失|失败|恶化|伤亡|崩溃|危机|冲突/.test(text)) return 'negative';
  if (/待评估|未知|暂无/.test(text)) return 'pending';
  return 'neutral';
}
</script>

<style lang="scss" scoped>
.event-panel {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
}

.watermark {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 56px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
}

.panel-header,
.sub-header,
.event-title-row,
.crisis-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.panel-kicker {
  margin: 0 0 3px;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

h3,
h4,
p {
  margin: 0;
}

h3 {
  font-size: 17px;
}

h4 {
  font-size: 15px;
}

.event-section,
.event-card,
.crisis-card {
  position: relative;
  z-index: 1;
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.event-section {
  padding: 10px;
}

.divider-ornament {
  margin: 6px 0 10px;
  color: var(--qyc-vermilion-faded);
  font-size: 10px;
  letter-spacing: 0.4em;
  text-align: center;
  opacity: 0.7;
}

.timeline {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.timeline-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-diamond {
  color: var(--qyc-vermilion);
  font-size: 12px;
  line-height: 1;
}

.rail-line {
  flex: 1;
  width: 1px;
  margin-top: 2px;
  background: var(--qyc-vermilion-faded);
  opacity: 0.5;
}

.event-card,
.crisis-card {
  padding: 10px;
}

.case-no {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

time {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
}

.event-card strong,
.crisis-card strong {
  display: block;
  margin-top: 5px;
  color: var(--qyc-ink);
  font-size: 14px;
}

.impact-field,
.severity-field,
.trigger-field {
  display: block;
  margin-top: 8px;
}

.impact-field span,
.severity-field span,
.trigger-field span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.impact-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.impact-pill.positive {
  background: rgba(74, 124, 63, 0.16);
  color: var(--qyc-ok);
}

.impact-pill.negative {
  background: rgba(178, 34, 34, 0.16);
  color: var(--qyc-danger);
}

.impact-pill.pending {
  background: rgba(122, 101, 80, 0.16);
  color: var(--qyc-ink-faint);
}

.impact-pill.neutral {
  background: rgba(61, 90, 128, 0.16);
  color: var(--qyc-info);
}

.trigger-field p {
  padding: 6px 8px;
  border: 1px dashed var(--qyc-warn);
  border-radius: 8px;
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.5;
  background: rgba(184, 115, 22, 0.05);
}

.crisis-list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.crisis-card {
  overflow: hidden;
  border-left-width: 5px;
}

.crisis-card.low {
  border-left-color: var(--qyc-info);
}

.crisis-card.medium {
  border-left-color: var(--qyc-warn);
}

.crisis-card.high,
.crisis-card.critical {
  border-left-color: var(--qyc-danger);
}

.crisis-alarm {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -10px -10px 8px;
  padding: 4px 10px;
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.crisis-alarm.low {
  background: rgba(61, 90, 128, 0.12);
  color: var(--qyc-info);
}

.crisis-alarm.medium {
  background: rgba(184, 115, 22, 0.14);
  color: var(--qyc-warn);
}

.crisis-alarm.high {
  background: rgba(178, 34, 34, 0.14);
  color: var(--qyc-danger);
}

.crisis-alarm.critical {
  background: rgba(178, 34, 34, 0.22);
  color: var(--qyc-danger);
  animation: alarm-blink 1.4s ease-in-out infinite;
}

@keyframes alarm-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.alarm-dot {
  font-size: 10px;
}

.severity-field b {
  color: var(--qyc-vermilion);
  font-size: 13px;
}

.edit-btn,
.small-btn,
.danger-btn {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
  cursor: pointer;
}

.edit-btn.active,
.small-btn:hover {
  border-color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-vermilion);
}

.danger-btn {
  color: var(--qyc-danger);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper);
  color: var(--qyc-ink);
  font-size: 13px;
  padding: 6px 8px;
}

.form-textarea {
  resize: vertical;
}

.time-input {
  max-width: 150px;
}

.empty-hint {
  padding: 10px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}
</style>
