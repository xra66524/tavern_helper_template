<template>
  <div class="military-panel">
    <div class="watermark" aria-hidden="true">TOP SECRET</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">MILITARY LEDGER</p>
        <h3>⚔️ 军事案卷</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <section class="summary-grid">
      <article class="summary-tile total-seal">
        <span class="tile-label">总兵力</span>
        <div class="seal-body">
          <input v-if="editing" v-model.number="军事.总兵力" type="number" min="0" class="form-input number" />
          <strong v-else>{{ formatNumber(军事.总兵力) }}</strong>
          <span class="seal-unit">员</span>
        </div>
      </article>

      <article class="summary-tile ammo">
        <span class="tile-label">
          现代弹药
          <span
            class="ammo-hint-trigger"
            tabindex="0"
            role="tooltip"
            title=""
            @click.stop="showAmmoHint = !showAmmoHint"
            @keydown.enter="showAmmoHint = !showAmmoHint"
            >ⓘ</span
          >
        </span>
        <div class="ammo-row">
          <span class="status-dot" :style="{ backgroundColor: ammoColor }"></span>
          <input v-if="editing" v-model="军事.现代弹药" type="text" class="form-input ammo-input" />
          <strong v-else>{{ 军事.现代弹药 || '未记录' }}</strong>
        </div>
        <div class="ammo-bar" :class="{ critical: ammoLevel <= 25 }">
          <i :style="{ width: ammoWidth, backgroundColor: ammoColor }"></i>
        </div>
        <div v-if="showAmmoHint" class="ammo-hint">
          <p>弹药条根据「现代弹药」文本中的关键词自动映射：</p>
          <table>
            <tbody>
              <tr>
                <td><span class="hint-dot danger"></span> 耗尽 / 无弹 / 归零</td>
                <td class="hint-val">0% · 红色闪烁</td>
              </tr>
              <tr>
                <td><span class="hint-dot danger"></span> 危急 / 见底</td>
                <td class="hint-val">18% · 红色</td>
              </tr>
              <tr>
                <td><span class="hint-dot warn"></span> 紧张 / 不足</td>
                <td class="hint-val">38% · 黄色</td>
              </tr>
              <tr>
                <td><span class="hint-dot ok"></span> 过半 / 消耗</td>
                <td class="hint-val">62% · 绿色</td>
              </tr>
              <tr>
                <td><span class="hint-dot ok"></span> 充足 / 满</td>
                <td class="hint-val">92% · 绿色</td>
              </tr>
            </tbody>
          </table>
          <p class="hint-foot">多个关键词按上表顺序优先匹配。可直接编辑文本触发重算。</p>
        </div>
      </article>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>部队卡片</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addUnit">＋ 部队</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="unitEntries.length === 0" class="empty-hint">暂无部队记录</div>
      <div v-else class="unit-list">
        <article v-for="[name, unit] in unitEntries" :key="name" class="unit-card">
          <div class="card-title-row">
            <span class="unit-emblem">🪖</span>
            <input
              v-if="editing"
              :value="name"
              type="text"
              class="form-input title-input"
              @change="renameRecord(军事.部队, name, ($event.target as HTMLInputElement).value)"
            />
            <h5 v-else>{{ name }}</h5>
            <button v-if="editing" type="button" class="danger-btn" @click="removeRecord(军事.部队, name)">✕</button>
          </div>

          <div class="field-grid">
            <label>
              <span>兵力</span>
              <input v-if="editing" v-model.number="unit.兵力" type="number" min="0" class="form-input" />
              <b v-else>{{ formatNumber(unit.兵力) }} 人</b>
            </label>
            <label>
              <span>训练</span>
              <select v-if="editing" v-model="unit.训练水平" class="form-select">
                <option v-for="opt in 训练水平选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <b v-else :style="{ color: trainingColor(unit.训练水平) }">{{ unit.训练水平 || '未知' }}</b>
            </label>
            <label>
              <span>士气</span>
              <input v-if="editing" v-model="unit.士气" type="text" class="form-input" />
              <b v-else>
                <span class="morale-stars">{{ moraleStars(unit.士气) }}</span>
                <span class="morale-text">{{ unit.士气 || '未知' }}</span>
              </b>
            </label>
            <label>
              <span>位置</span>
              <input v-if="editing" v-model="unit.当前位置" type="text" class="form-input" />
              <b v-else>{{ unit.当前位置 || '未知' }}</b>
            </label>
          </div>

          <label class="long-field">
            <span>当前任务</span>
            <textarea v-if="editing" v-model="unit.当前任务" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ unit.当前任务 || '无' }}</p>
          </label>
          <label class="long-field">
            <span>备注</span>
            <textarea v-if="editing" v-model="unit.备注" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ unit.备注 || '无' }}</p>
          </label>
        </article>
      </div>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>装备清单</h4>
        <button v-if="editing" type="button" class="small-btn" @click="addEquipment">＋ 装备</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="equipmentEntries.length === 0" class="empty-hint">暂无装备记录</div>
      <table v-else class="equipment-table">
        <thead>
          <tr>
            <th>装备</th>
            <th>数量</th>
            <th>来源</th>
            <th>状态</th>
            <th>备注</th>
            <th v-if="editing"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[name, item] in equipmentEntries" :key="name">
            <td class="equip-name">
              <span class="equip-lamp" :style="{ backgroundColor: equipmentColor(item.状态) }"></span>
              <input
                v-if="editing"
                :value="name"
                type="text"
                class="form-input title-input"
                @change="renameRecord(军事.武器装备, name, ($event.target as HTMLInputElement).value)"
              />
              <strong v-else>{{ name }}</strong>
            </td>
            <td>
              <input v-if="editing" v-model.number="item.数量" type="number" min="0" class="form-input" />
              <b v-else>{{ formatNumber(item.数量) }}</b>
            </td>
            <td>
              <input v-if="editing" v-model="item.来源" type="text" class="form-input" />
              <b v-else>{{ item.来源 || '未知' }}</b>
            </td>
            <td>
              <select v-if="editing" v-model="item.状态" class="form-select">
                <option v-for="opt in 装备状态选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <b v-else :style="{ color: equipmentColor(item.状态) }">{{ item.状态 || '未知' }}</b>
            </td>
            <td>
              <textarea v-if="editing" v-model="item.备注" class="form-textarea" rows="1" placeholder="备注"></textarea>
              <span v-else class="note">{{ item.备注 || '无备注' }}</span>
            </td>
            <td v-if="editing">
              <button type="button" class="danger-btn" @click="removeRecord(军事.武器装备, name)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 装备状态参考列表, 训练水平参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);
const showAmmoHint = ref(false);

// 初始化军事数据（避免在 computed 中做副作用）
watch(
  () => store.data,
  data => {
    data.军事 ??= { 总兵力: 0, 部队: {}, 武器装备: {}, 现代弹药: '' };
    data.军事.部队 ??= {};
    data.军事.武器装备 ??= {};
  },
  { immediate: true, once: true },
);

const 军事 = computed<any>(() => store.data.军事 ?? {});

const unitEntries = computed(() => Object.entries(军事.value.部队 ?? {}) as [string, any][]);
const equipmentEntries = computed(() => Object.entries(军事.value.武器装备 ?? {}) as [string, any][]);
const 训练水平选项 = [...训练水平参考列表];
const 装备状态选项 = [...装备状态参考列表];

/**
 * 弹药条等级：从 `现代弹药` 文本中关键词匹配。
 * ⚠️ 编辑时请注意，进度条显示取决于中文关键词：
 *   "耗尽/无弹/归零" → 0%  🔴 闪烁
 *   "危急/见底"      → 18% 🔴
 *   "紧张/不足"      → 38% 🟡
 *   "过半/消耗"      → 62% 🟢
 *   "充足/满"       → 92% 🟢
 *   不匹配任何关键词 → 48% 🟡（默认）
 * 多个关键词按代码顺序优先匹配靠前的。
 */
const ammoLevel = computed(() => {
  const text = String(军事.value.现代弹药 ?? '');
  if (/耗尽|无弹|归零/.test(text)) return 0;
  if (/危急|见底/.test(text)) return 18;
  if (/紧张|不足/.test(text)) return 38;
  if (/过半|消耗/.test(text)) return 62;
  if (/充足|满/.test(text)) return 92;
  return 48;
});
const ammoWidth = computed(() => `${ammoLevel.value}%`);
const ammoColor = computed(() =>
  ammoLevel.value <= 25 ? 'var(--qyc-danger)' : ammoLevel.value <= 55 ? 'var(--qyc-warn)' : 'var(--qyc-ok)',
);

function formatNumber(value: unknown): string {
  return Number(value || 0).toLocaleString('zh-CN');
}

function trainingColor(value: string): string {
  const map: Record<string, string> = {
    未训练: 'var(--qyc-danger)',
    基础训练中: 'var(--qyc-warn)',
    初步形成战斗力: 'var(--qyc-info)',
    合格: 'var(--qyc-ok)',
    精锐: 'var(--qyc-accent)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

function equipmentColor(value: string): string {
  const map: Record<string, string> = {
    完好: 'var(--qyc-ok)',
    部分磨损: 'var(--qyc-warn)',
    严重损耗: 'var(--qyc-danger)',
    报废: 'var(--qyc-ink-faint)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

function moraleStars(value: string): string {
  const map: Record<string, string> = {
    高昂: '★★★',
    稳定: '★★☆',
    低落: '★☆☆',
    动摇: '☆☆☆',
    溃散: '✕✕✕',
  };
  return map[value] ?? '☆☆☆';
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

function addUnit() {
  const name = `新部队 ${unitEntries.value.length + 1}`;
  军事.value.部队[name] = {
    兵力: 0,
    训练水平: '未训练',
    士气: '稳定',
    当前位置: store.data?.基地车?.当前位置 || '',
    当前任务: '待命',
    备注: '',
  };
}

function addEquipment() {
  const name = `新装备 ${equipmentEntries.value.length + 1}`;
  军事.value.武器装备[name] = {
    数量: 0,
    来源: '未知',
    状态: '完好',
    备注: '',
  };
}
</script>

<style lang="scss" scoped>
.military-panel {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
}

.watermark {
  position: absolute;
  top: 38%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 60px;
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
.sub-header,
.card-title-row {
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
  color: var(--qyc-ink);
  font-size: 15px;
}

h5 {
  color: var(--qyc-vermilion);
  font-size: 15px;
}

.summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 8px;
}

.summary-tile,
.section-card,
.unit-card {
  position: relative;
  z-index: 1;
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.summary-tile {
  min-width: 0;
  padding: 11px;
}

.total-seal {
  display: grid;
  gap: 6px;
  border: 2px solid var(--qyc-vermilion);
  background: radial-gradient(ellipse at center, rgba(184, 56, 30, 0.06), transparent 70%), var(--qyc-paper-light);
}

.seal-body {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-seal strong {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 22px;
  font-weight: 800;
}

.seal-unit {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.tile-label,
.long-field span,
.field-grid span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.summary-tile strong {
  display: block;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 18px;
}

.ammo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 999px;
}

.ammo-input {
  flex: 1;
  min-width: 0;
}

.ammo-bar {
  height: 9px;
  overflow: hidden;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--qyc-paper-dark);
}

.ammo-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.18) 0,
    rgba(255, 255, 255, 0.18) 4px,
    transparent 4px,
    transparent 8px
  );
}

.ammo-bar.critical {
  animation: ammo-blink 1.2s ease-in-out infinite;
}

@keyframes ammo-blink {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(178, 34, 34, 0);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.25);
  }
}

/* 弹药条关键词提示 */
.ammo-hint-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  border: 1px solid var(--qyc-ink-faint);
  border-radius: 999px;
  color: var(--qyc-ink-faint);
  font-size: 10px;
  font-weight: 800;
  cursor: help;
  vertical-align: middle;
  user-select: none;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.ammo-hint-trigger:hover,
.ammo-hint-trigger:focus {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  outline: none;
}

.ammo-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  font-size: 12px;
  line-height: 1.6;
}

.ammo-hint p {
  margin: 0 0 4px;
  color: var(--qyc-ink-dim);
  font-size: 11px;
}

.ammo-hint table {
  width: 100%;
  border-collapse: collapse;
}

.ammo-hint td {
  padding: 2px 4px;
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.hint-val {
  text-align: right;
  font-family: var(--qyc-font-mono);
  font-size: 11px;
}

.hint-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  margin-right: 4px;
}

.hint-dot.danger {
  background-color: var(--qyc-danger);
}

.hint-dot.warn {
  background-color: var(--qyc-warn);
}

.hint-dot.ok {
  background-color: var(--qyc-ok);
}

.hint-foot {
  margin-top: 4px !important;
  color: var(--qyc-ink-faint) !important;
  font-size: 10px !important;
  font-style: italic;
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

.unit-list {
  display: grid;
  gap: 10px;
}

.unit-card {
  padding: 10px;
}

.unit-emblem {
  color: var(--qyc-vermilion);
  font-size: 16px;
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

.long-field p,
.note {
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.5;
}

.morale-stars {
  color: var(--qyc-vermilion);
  font-size: 13px;
  letter-spacing: 1px;
  margin-right: 4px;
}

.morale-text {
  color: var(--qyc-ink);
  font-size: 13px;
}

.equipment-table {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 13px;
}

.equipment-table th {
  padding: 6px 8px;
  border-bottom: 2px solid var(--qyc-vermilion);
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-align: left;
}

.equipment-table td {
  padding: 8px;
  border-bottom: 1px solid var(--qyc-line);
  vertical-align: middle;
}

.equipment-table tbody tr:nth-child(odd) {
  background: rgba(188, 171, 149, 0.08);
}

.equip-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.equip-lamp {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 999px;
  box-shadow: 0 0 4px currentColor;
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
  font-weight: 800;
}

.empty-hint {
  padding: 10px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 360px) {
  .summary-grid,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .equipment-table {
    font-size: 12px;
  }
}
</style>
