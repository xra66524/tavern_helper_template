<template>
  <div class="finance-panel">
    <div class="watermark" aria-hidden="true">TREASURY</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">FISCAL LEDGER</p>
        <h3>💰 财政案卷</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <section class="summary-grid">
      <article class="summary-tile status-tile" :class="financeStatusClass">
        <span class="tile-label">财政状况</span>
        <div class="status-row">
          <span class="status-dot" :style="{ backgroundColor: financeStatusColor }"></span>
          <select v-if="editing" v-model="财政.财政状况" class="form-select">
            <option v-for="opt in 财政状况选项" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <strong v-else :style="{ color: financeStatusColor }">{{ 财政.财政状况 || '未记录' }}</strong>
        </div>
      </article>

      <article class="summary-tile balance-tile">
        <span class="tile-label">收支差额</span>
        <div class="balance-body">
          <input v-if="editing" v-model.number="balance" type="number" class="form-input number" placeholder="差额" />
          <strong v-else :class="balanceClass">{{ formatNumber(balance) }}</strong>
          <span class="balance-unit">{{ balance >= 0 ? '盈余' : '赤字' }}</span>
        </div>
      </article>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>货币体系</h4>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>
      <textarea v-if="editing" v-model="财政.货币体系" class="form-textarea" rows="2"></textarea>
      <p v-else class="currency-text">{{ 财政.货币体系 || '未设定货币体系' }}</p>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>收入来源</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addIncome">＋ 收入项</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="incomeEntries.length === 0" class="empty-hint">暂无收入记录</div>
      <div v-else class="bar-list">
        <div v-for="[name, value] in incomeEntries" :key="name" class="bar-row income">
          <div class="bar-label">
            <input
              v-if="editing"
              :value="name"
              type="text"
              class="form-input title-input"
              @change="renameRecord(财政.收入来源, name, ($event.target as HTMLInputElement).value)"
            />
            <span v-else class="bar-name">{{ name }}</span>
            <button v-if="editing" type="button" class="danger-btn" @click="removeRecord(财政.收入来源, name)">
              ✕
            </button>
          </div>
          <div class="bar-track">
            <i :style="{ width: barWidth(value, incomeMax) }"></i>
          </div>
          <div class="bar-value">
            <input
              v-if="editing"
              v-model.number="财政.收入来源[name]"
              type="number"
              min="0"
              class="form-input number"
            />
            <b v-else>{{ formatNumber(value) }}</b>
          </div>
        </div>
      </div>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>主要支出</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addExpense">＋ 支出项</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="expenseEntries.length === 0" class="empty-hint">暂无支出记录</div>
      <div v-else class="bar-list">
        <div v-for="[name, value] in expenseEntries" :key="name" class="bar-row expense">
          <div class="bar-label">
            <input
              v-if="editing"
              :value="name"
              type="text"
              class="form-input title-input"
              @change="renameRecord(财政.主要支出, name, ($event.target as HTMLInputElement).value)"
            />
            <span v-else class="bar-name">{{ name }}</span>
            <button v-if="editing" type="button" class="danger-btn" @click="removeRecord(财政.主要支出, name)">
              ✕
            </button>
          </div>
          <div class="bar-track">
            <i :style="{ width: barWidth(value, expenseMax) }"></i>
          </div>
          <div class="bar-value">
            <input
              v-if="editing"
              v-model.number="财政.主要支出[name]"
              type="number"
              min="0"
              class="form-input number"
            />
            <b v-else>{{ formatNumber(value) }}</b>
          </div>
        </div>
      </div>
    </section>

    <section class="section-card audit-card">
      <div class="sub-header">
        <h4>财权与审计</h4>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>
      <div class="audit-grid">
        <label>
          <span>预算审批权</span>
          <input v-if="editing" v-model="财政.预算审批权" type="text" class="form-input" placeholder="如 决策核心" />
          <b v-else>{{ 财政.预算审批权 || '未设定' }}</b>
        </label>
        <label>
          <span>审计机构</span>
          <input v-if="editing" v-model="财政.审计机构" type="text" class="form-input" placeholder="如 监察委员会" />
          <b v-else>{{ 财政.审计机构 || '未设定' }}</b>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 财政状况参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);

watch(
  () => store.data,
  data => {
    data.组织结构 ??= {};
    data.组织结构.财政 ??= {
      货币体系: '',
      收入来源: {},
      主要支出: {},
      财政状况: '平衡',
    };
    data.组织结构.财政.收入来源 ??= {};
    data.组织结构.财政.主要支出 ??= {};
  },
  { immediate: true, once: true },
);

const 财政 = computed<any>(() => store.data.组织结构.财政 ?? {});
const incomeEntries = computed(() => Object.entries(财政.value.收入来源 ?? {}) as [string, number][]);
const expenseEntries = computed(() => Object.entries(财政.value.主要支出 ?? {}) as [string, number][]);
const 财政状况选项 = [...财政状况参考列表];

const incomeTotal = computed(() => incomeEntries.value.reduce((sum, [, v]) => sum + Number(v || 0), 0));
const expenseTotal = computed(() => expenseEntries.value.reduce((sum, [, v]) => sum + Number(v || 0), 0));
const balance = computed({
  get: () => incomeTotal.value - expenseTotal.value,
  set: (val: number) => {
    // 编辑差额时按比例调整支出总额以匹配；简单实现：直接覆盖支出总额到收入-差额
    const target = Math.max(0, incomeTotal.value - Number(val || 0));
    if (expenseEntries.value.length === 0) {
      财政.value.主要支出['调平项'] = target;
    } else {
      const ratio = expenseTotal.value > 0 ? target / expenseTotal.value : 0;
      for (const [key] of expenseEntries.value) {
        财政.value.主要支出[key] = Math.round(Number(财政.value.主要支出[key] || 0) * ratio);
      }
    }
  },
});

const incomeMax = computed(() => Math.max(1, ...incomeEntries.value.map(([, v]) => Number(v || 0))));
const expenseMax = computed(() => Math.max(1, ...expenseEntries.value.map(([, v]) => Number(v || 0))));

const financeStatusColor = computed(() => {
  const map: Record<string, string> = {
    充裕: 'var(--qyc-ok)',
    平衡: 'var(--qyc-info)',
    紧张: 'var(--qyc-warn)',
    赤字: 'var(--qyc-danger)',
    破产: 'var(--qyc-danger)',
  };
  return map[财政.value.财政状况] ?? 'var(--qyc-ink-dim)';
});

const financeStatusClass = computed(() => {
  const v = 财政.value.财政状况;
  if (v === '赤字' || v === '破产') return 'critical';
  if (v === '紧张') return 'warn';
  return 'ok';
});

const balanceClass = computed(() => (balance.value >= 0 ? 'positive' : 'negative'));

function formatNumber(value: unknown): string {
  return Number(value || 0).toLocaleString('zh-CN');
}

function barWidth(value: number, max: number): string {
  const pct = max > 0 ? Math.min(100, (Number(value || 0) / max) * 100) : 0;
  return `${pct}%`;
}

function renameRecord(record: Record<string, any>, oldKey: string, newKey: string) {
  const next = newKey.trim();
  if (!next || next === oldKey || record[next]) return;
  record[next] = record[oldKey];
  delete record[oldKey];
}

function removeRecord(record: Record<string, any>, key: string) {
  if (confirm(`确认删除「${key}」？`)) delete record[key];
}

function addIncome() {
  const name = `新收入 ${incomeEntries.value.length + 1}`;
  财政.value.收入来源[name] = 0;
}

function addExpense() {
  const name = `新支出 ${expenseEntries.value.length + 1}`;
  财政.value.主要支出[name] = 0;
}
</script>

<style lang="scss" scoped>
.finance-panel {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
}

.watermark {
  position: absolute;
  top: 40%;
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
.summary-grid,
.section-card {
  position: relative;
  z-index: 1;
}

.panel-header,
.sub-header {
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
p {
  margin: 0;
}

h3 {
  font-size: 17px;
}

h4 {
  color: var(--qyc-ink);
  font-size: 15px;
}

.summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.summary-tile,
.section-card {
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.summary-tile {
  min-width: 0;
  padding: 11px;
}

.status-tile.critical {
  border-color: var(--qyc-danger);
  background: radial-gradient(ellipse at center, rgba(178, 34, 34, 0.08), transparent 70%), var(--qyc-paper-light);
}

.status-tile.warn {
  border-color: var(--qyc-warn);
}

.status-tile.ok {
  border-color: var(--qyc-ok);
}

.tile-label {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 6px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 999px;
  box-shadow: 0 0 6px currentColor;
}

.status-tile strong {
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 18px;
  font-weight: 800;
}

.balance-body {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.balance-tile strong {
  font-family: var(--qyc-font-title);
  font-size: 20px;
  font-weight: 800;
}

.balance-tile strong.positive {
  color: var(--qyc-ok);
}

.balance-tile strong.negative {
  color: var(--qyc-danger);
}

.balance-unit {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.section-card {
  padding: 11px;
}

.divider-ornament {
  margin: 6px 0 10px;
  color: var(--qyc-vermilion-faded);
  font-size: 10px;
  letter-spacing: 0.4em;
  text-align: center;
  opacity: 0.7;
}

.currency-text {
  color: var(--qyc-ink-dim);
  font-size: 14px;
  line-height: 1.55;
}

.bar-list {
  display: grid;
  gap: 10px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr) minmax(0, 0.6fr);
  align-items: center;
  gap: 8px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bar-name {
  color: var(--qyc-ink);
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(188, 171, 149, 0.25);
  overflow: hidden;
}

.bar-row.income .bar-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--qyc-ok), #6a9c5f);
}

.bar-row.expense .bar-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--qyc-vermilion), var(--qyc-warn));
}

.bar-value {
  text-align: right;
}

.bar-value b {
  color: var(--qyc-ink);
  font-family: var(--qyc-font-mono);
  font-size: 13px;
}

.audit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.audit-grid span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.audit-grid b {
  color: var(--qyc-ink);
  font-size: 14px;
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
  flex: 1;
  min-width: 0;
  font-weight: 700;
}

.empty-hint {
  padding: 10px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 360px) {
  .summary-grid,
  .audit-grid {
    grid-template-columns: 1fr;
  }

  .bar-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .bar-value {
    text-align: left;
  }
}
</style>
