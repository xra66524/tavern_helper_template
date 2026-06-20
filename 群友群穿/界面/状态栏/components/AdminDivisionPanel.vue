<template>
  <div class="admin-panel">
    <div class="watermark" aria-hidden="true">TERRITORY</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">ADMIN DIVISIONS</p>
        <h3>🗺️ 行政区划</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <div v-if="divisionEntries.length === 0" class="empty-hint">暂无行政区划记录</div>

    <section v-else class="division-groups">
      <article v-for="[level, items] in groupedDivisions" :key="level" class="level-group">
        <div class="level-header">
          <span class="level-seal" :class="levelClass(level)">{{ levelIcon(level) }}</span>
          <h4>{{ level }}级区划</h4>
          <span class="level-count">{{ items.length }} 处</span>
        </div>
        <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

        <div class="division-list">
          <article
            v-for="[name, div] in items"
            :key="name"
            class="division-card"
            :class="relationClass(div.与中央关系)"
          >
            <div class="card-title-row">
              <span class="division-emblem">{{ levelIcon(div.层级) }}</span>
              <input
                v-if="editing"
                :value="name"
                type="text"
                class="form-input title-input"
                @change="renameDivision(name, ($event.target as HTMLInputElement).value)"
              />
              <h5 v-else>{{ name }}</h5>
              <button v-if="editing" type="button" class="danger-btn" @click="removeDivision(name)">✕</button>
            </div>

            <div class="field-grid">
              <label>
                <span>层级</span>
                <select v-if="editing" v-model="div.层级" class="form-select">
                  <option v-for="opt in 层级选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <b v-else>{{ div.层级 || '未知' }}</b>
              </label>
              <label>
                <span>治理机构</span>
                <input v-if="editing" v-model="div.治理机构" type="text" class="form-input" />
                <b v-else>{{ div.治理机构 || '未指派' }}</b>
              </label>
              <label>
                <span>人口</span>
                <input v-if="editing" v-model.number="div.人口" type="number" min="0" class="form-input" />
                <b v-else>{{ formatNumber(div.人口) }}</b>
              </label>
              <label>
                <span>治安状况</span>
                <input v-if="editing" v-model="div.治安状况" type="text" class="form-input" />
                <b v-else :style="{ color: securityColor(div.治安状况) }">{{ div.治安状况 || '未知' }}</b>
              </label>
              <label>
                <span>与中央关系</span>
                <select v-if="editing" v-model="div.与中央关系" class="form-select">
                  <option v-for="opt in 关系选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <b v-else :style="{ color: relationColor(div.与中央关系) }">{{ div.与中央关系 || '未知' }}</b>
              </label>
            </div>

            <label class="long-field">
              <span>备注</span>
              <textarea v-if="editing" v-model="div.备注" class="form-textarea" rows="2"></textarea>
              <p v-else>{{ div.备注 || '无' }}</p>
            </label>
          </article>
        </div>
      </article>
    </section>

    <button v-if="editing" type="button" class="add-btn" @click="addDivision">＋ 添加区划</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 地方中央关系参考列表, 行政区划层级参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);

watch(
  () => store.data,
  data => {
    data.组织结构 ??= {};
    data.组织结构.行政区划 ??= {};
  },
  { immediate: true, once: true },
);

const 行政区划 = computed<Record<string, any>>(() => store.data.组织结构.行政区划 ?? {});
const divisionEntries = computed(() => Object.entries(行政区划.value) as [string, any][]);
const 层级选项 = [...行政区划层级参考列表];
const 关系选项 = [...地方中央关系参考列表];

/** 按层级分组，按参考列表顺序排列 */
const groupedDivisions = computed(() => {
  const groups = new Map<string, [string, any][]>();
  for (const entry of divisionEntries.value) {
    const level = entry[1].层级 || '未分类';
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level)!.push(entry);
  }
  // 按参考列表顺序输出，未分类放最后
  const ordered: [string, [string, any][]][] = [];
  for (const level of 层级选项) {
    if (groups.has(level)) ordered.push([level, groups.get(level)!]);
  }
  for (const [level, items] of groups) {
    if (!层级选项.includes(level as any)) ordered.push([level, items]);
  }
  return ordered;
});

function formatNumber(value: unknown): string {
  return Number(value || 0).toLocaleString('zh-CN');
}

function levelIcon(level: string): string {
  const map: Record<string, string> = {
    据点: '📍',
    村级: '🏘️',
    乡级: '🏚️',
    县级: '🏛️',
    地级: '🏯',
    省级: '🗺️',
  };
  return map[level] ?? '▣';
}

function levelClass(level: string): string {
  const idx = 层级选项.indexOf(level as any);
  if (idx < 0) return 'unknown';
  if (idx <= 1) return 'low';
  if (idx <= 3) return 'mid';
  return 'high';
}

function securityColor(value: string): string {
  const map: Record<string, string> = {
    稳固: 'var(--qyc-ok)',
    稳定: 'var(--qyc-ok)',
    紧张: 'var(--qyc-warn)',
    动荡: 'var(--qyc-danger)',
    失控: 'var(--qyc-danger)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

function relationColor(value: string): string {
  const map: Record<string, string> = {
    服从: 'var(--qyc-ok)',
    观望: 'var(--qyc-info)',
    阳奉阴违: 'var(--qyc-warn)',
    对抗: 'var(--qyc-danger)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

function relationClass(value: string): string {
  if (value === '对抗') return 'relation-hostile';
  if (value === '阳奉阴违') return 'relation-defiant';
  return '';
}

function renameDivision(oldKey: string, newKey: string) {
  const next = newKey.trim();
  if (!next || next === oldKey || 行政区划.value[next]) return;
  行政区划.value[next] = 行政区划.value[oldKey];
  delete 行政区划.value[oldKey];
}

function removeDivision(name: string) {
  if (confirm(`确认删除区划「${name}」？`)) delete 行政区划.value[name];
}

function addDivision() {
  const name = `新区划 ${divisionEntries.value.length + 1}`;
  行政区划.value[name] = {
    层级: '村级',
    治理机构: '待指派',
    人口: 0,
    治安状况: '稳定',
    与中央关系: '服从',
    备注: '',
  };
}
</script>

<style lang="scss" scoped>
.admin-panel {
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
.level-header,
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-header,
.level-group,
.division-card {
  position: relative;
  z-index: 1;
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

.level-group {
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
  padding: 12px;
}

.level-header {
  margin-bottom: 4px;
}

.level-seal {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 2px solid var(--qyc-vermilion);
  border-radius: 8px;
  background: var(--qyc-paper);
  font-size: 16px;
}

.level-seal.low {
  border-color: var(--qyc-ok);
}

.level-seal.mid {
  border-color: var(--qyc-warn);
}

.level-seal.high {
  border-color: var(--qyc-accent);
}

.level-count {
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
}

.divider-ornament {
  margin: 6px 0 10px;
  color: var(--qyc-vermilion-faded);
  font-size: 10px;
  letter-spacing: 0.4em;
  text-align: center;
  opacity: 0.7;
}

.division-list {
  display: grid;
  gap: 10px;
}

.division-card {
  border: 1px solid var(--qyc-line);
  border-radius: 10px;
  background: var(--qyc-paper);
  padding: 10px;
}

.division-card.relation-defiant {
  border-left: 3px solid var(--qyc-warn);
}

.division-card.relation-hostile {
  border-left: 3px solid var(--qyc-danger);
  background: rgba(178, 34, 34, 0.04);
}

.division-emblem {
  color: var(--qyc-vermilion);
  font-size: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.field-grid span,
.long-field span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.long-field {
  display: block;
  margin-top: 8px;
}

.long-field p {
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.5;
}

.edit-btn,
.small-btn,
.danger-btn,
.add-btn {
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
.small-btn:hover,
.add-btn:hover {
  border-color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-vermilion);
}

.danger-btn {
  color: var(--qyc-danger);
}

.add-btn {
  justify-self: center;
  padding: 8px 16px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-light);
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
  padding: 16px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
  border: 1px dashed var(--qyc-line);
  border-radius: 10px;
}

@media (max-width: 360px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
