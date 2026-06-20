<template>
  <div class="intel-panel">
    <div class="watermark" aria-hidden="true">CLASSIFIED</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">INTELLIGENCE DESK</p>
        <h3>🕵️ 情报案卷</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <section class="intel-summary">
      <article class="summary-card accuracy">
        <span>情报准确度</span>
        <select v-if="editing" v-model="情报.情报准确度" class="form-select">
          <option v-for="opt in 准确度选项" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <div v-else class="gauge">
          <div class="gauge-track">
            <i
              v-for="seg in 4"
              :key="seg"
              class="gauge-seg"
              :class="{ on: seg <= accuracyLevel }"
              :style="seg <= accuracyLevel ? { backgroundColor: accuracyColor(情报.情报准确度) } : {}"
            ></i>
          </div>
          <strong :style="{ color: accuracyColor(情报.情报准确度) }">{{ 情报.情报准确度 || '未知' }}</strong>
        </div>
      </article>

      <article class="summary-card">
        <span>反间谍 🛡️</span>
        <textarea v-if="editing" v-model="情报.反间谍" class="form-textarea" rows="2"></textarea>
        <p v-else>{{ 情报.反间谍 || '未建立' }}</p>
      </article>

      <article class="summary-card full">
        <span>情报盲区</span>
        <textarea v-if="editing" v-model="情报.情报盲区" class="form-textarea" rows="2"></textarea>
        <p v-else>{{ 情报.情报盲区 || '暂无记录' }}</p>
      </article>
    </section>

    <section class="network-card">
      <div class="sub-header">
        <h4>对外情报网络</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addNode">＋ 节点</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="networkEntries.length === 0" class="empty-hint">暂无情报网络节点</div>
      <div v-else class="network-list">
        <article v-for="[target, node] in networkEntries" :key="target" class="node-card">
          <div class="node-title">
            <span v-if="!editing" class="signal" :title="node.可靠性">
              <i
                v-for="bar in 4"
                :key="bar"
                class="signal-bar"
                :class="{ on: bar <= reliabilityBars(node.可靠性) }"
              ></i>
            </span>
            <input
              v-if="editing"
              :value="target"
              type="text"
              class="form-input title-input"
              @change="renameNode(target, ($event.target as HTMLInputElement).value)"
            />
            <h5 v-else>{{ target }}</h5>
            <span v-if="!editing" class="reliability" :style="{ color: reliabilityColor(node.可靠性) }">{{
              node.可靠性 || '未知'
            }}</span>
            <button v-if="editing" type="button" class="danger-btn" @click="removeNode(target)">✕</button>
          </div>

          <div class="field-grid">
            <label>
              <span>来源</span>
              <input v-if="editing" v-model="node.情报来源" type="text" class="form-input" />
              <b v-else>{{ node.情报来源 || '未知' }}</b>
            </label>
            <label>
              <span>可靠性</span>
              <select v-if="editing" v-model="node.可靠性" class="form-select">
                <option v-for="opt in 可靠性选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <b v-else>{{ node.可靠性 || '未知' }}</b>
            </label>
          </div>

          <label class="long-field">
            <span>覆盖范围</span>
            <textarea v-if="editing" v-model="node.覆盖范围" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ node.覆盖范围 || '未知' }}</p>
          </label>
          <label class="long-field">
            <span>最近情报</span>
            <div class="seal-line" aria-hidden="true">══════════ 机密 ══════════</div>
            <textarea v-if="editing" v-model="node.最近情报" class="form-textarea" rows="3"></textarea>
            <p v-else class="telegram">{{ node.最近情报 || '暂无' }}</p>
          </label>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 情报准确度参考列表, 情报可靠性参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);

watch(
  () => store.data,
  data => {
    data.情报 ??= { 对外情报网络: {}, 反间谍: '', 情报准确度: '盲区', 情报盲区: '' };
    data.情报.对外情报网络 ??= {};
  },
  { immediate: true, once: true },
);
const 情报 = computed<any>(() => store.data.情报 ?? {});
const networkEntries = computed(() => Object.entries(情报.value.对外情报网络 ?? {}) as [string, any][]);
const 准确度选项 = [...情报准确度参考列表];
const 可靠性选项 = [...情报可靠性参考列表];

function accuracyColor(value: string): string {
  const map: Record<string, string> = {
    高: 'var(--qyc-ok)',
    中: 'var(--qyc-info)',
    低: 'var(--qyc-warn)',
    盲区: 'var(--qyc-danger)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

const accuracyLevel = computed(() => {
  const map: Record<string, number> = { 高: 4, 中: 3, 低: 2, 盲区: 1 };
  return map[情报.value.情报准确度] ?? 0;
});

function reliabilityBars(value: string): number {
  const map: Record<string, number> = {
    可靠: 4,
    基本可靠: 3,
    待验证: 2,
    不可靠: 1,
    反间嫌疑: 1,
  };
  return map[value] ?? 0;
}

function reliabilityColor(value: string): string {
  const map: Record<string, string> = {
    可靠: 'var(--qyc-ok)',
    基本可靠: 'var(--qyc-info)',
    待验证: 'var(--qyc-warn)',
    不可靠: 'var(--qyc-danger)',
    反间嫌疑: 'var(--qyc-accent)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

function renameNode(oldKey: string, newKey: string) {
  const next = newKey.trim();
  const record = 情报.value.对外情报网络;
  if (!next || next === oldKey || record[next]) return;
  record[next] = record[oldKey];
  delete record[oldKey];
}

function removeNode(target: string) {
  if (confirm(`确认删除情报节点「${target}」？`)) delete 情报.value.对外情报网络[target];
}

function addNode() {
  const target = `新目标 ${networkEntries.value.length + 1}`;
  情报.value.对外情报网络[target] = {
    情报来源: '未知',
    可靠性: '待验证',
    覆盖范围: '待建立',
    最近情报: '暂无',
  };
}
</script>

<style lang="scss" scoped>
.intel-panel {
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
.node-title {
  display: flex;
  align-items: center;
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
h5,
p {
  margin: 0;
}

h3 {
  font-size: 17px;
}

h4 {
  font-size: 15px;
}

h5 {
  color: var(--qyc-vermilion);
  font-size: 15px;
}

.intel-summary {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 8px;
}

.summary-card,
.network-card,
.node-card {
  position: relative;
  z-index: 1;
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.summary-card,
.network-card {
  padding: 10px;
}

.summary-card.full {
  grid-column: 1 / -1;
}

.summary-card span,
.field-grid span,
.long-field span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.gauge {
  display: grid;
  gap: 6px;
}

.gauge-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.gauge-seg {
  height: 8px;
  border-radius: 2px;
  background: var(--qyc-paper-dark);
}

.gauge-seg.on {
  box-shadow: 0 0 4px currentColor;
}

.summary-card strong {
  font-size: 18px;
}

.summary-card p,
.long-field p {
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.5;
}

.network-list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.node-card {
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

.signal {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.signal-bar {
  width: 3px;
  background: var(--qyc-paper-dark);
  border-radius: 1px;
}

.signal-bar:nth-child(1) {
  height: 4px;
}

.signal-bar:nth-child(2) {
  height: 7px;
}

.signal-bar:nth-child(3) {
  height: 10px;
}

.signal-bar:nth-child(4) {
  height: 13px;
}

.signal-bar.on {
  background: var(--qyc-vermilion);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.long-field {
  display: block;
  margin-top: 8px;
}

.seal-line {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-align: center;
  opacity: 0.7;
  margin-bottom: 4px;
}

.telegram {
  font-family: var(--qyc-font-mono);
  letter-spacing: 0.04em;
}

.reliability {
  font-size: 12px;
  font-weight: 800;
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

.title-input {
  font-weight: 800;
}

.empty-hint {
  padding: 10px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 360px) {
  .intel-summary,
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
