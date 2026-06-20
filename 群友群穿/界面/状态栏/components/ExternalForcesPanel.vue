<template>
  <div class="external-panel">
    <div class="watermark" aria-hidden="true">CONFIDENTIAL</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">FOREIGN CONTACTS</p>
        <h3>🌐 外部势力</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <div v-if="forceEntries.length === 0" class="empty-hint">暂无外部势力记录</div>

    <section v-else class="relation-table">
      <article v-for="[name, force] in forceEntries" :key="name" class="force-card">
        <div class="force-title">
          <button type="button" class="collapse-btn" @click="toggle(name)">{{ expanded.has(name) ? '▾' : '▸' }}</button>
          <span class="force-emblem" :aria-label="name">{{ flagEmoji(name) }}</span>
          <input
            v-if="editing"
            :value="name"
            type="text"
            class="form-input title-input"
            @change="renameForce(name, ($event.target as HTMLInputElement).value)"
          />
          <h4 v-else>{{ name }}</h4>
          <button v-if="editing" type="button" class="danger-btn" @click="removeForce(name)">✕</button>
        </div>

        <div class="matrix-row">
          <label>
            <span>态度</span>
            <select v-if="editing" v-model="force.对穿越者态度" class="form-select">
              <option v-for="opt in 态度选项" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <b v-else class="pill solid" :style="attitudeStyle(force.对穿越者态度)">{{
              force.对穿越者态度 || '未知'
            }}</b>
          </label>
          <label>
            <span>了解程度</span>
            <select v-if="editing" v-model="force.对穿越者了解程度" class="form-select">
              <option v-for="opt in 了解选项" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <b v-else>{{ force.对穿越者了解程度 || '未知' }}</b>
          </label>
          <label>
            <span>影响力</span>
            <input
              v-if="editing"
              v-model.number="force.在当地影响力"
              type="number"
              min="0"
              max="100"
              class="form-input"
            />
            <b v-else>{{ force.在当地影响力 ?? 0 }}%</b>
          </label>
          <label>
            <span>我方策略</span>
            <select v-if="editing" v-model="force.我方外交策略" class="form-select">
              <option v-for="opt in 策略选项" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <b v-else class="pill strategy">{{ force.我方外交策略 || '观望' }}</b>
          </label>
        </div>

        <div class="influence-row">
          <div class="influence-bar"><i :style="{ width: `${Number(force.在当地影响力 || 0)}%` }"></i></div>
          <span v-if="!editing" class="influence-tick">{{ Number(force.在当地影响力 || 0) }}%</span>
        </div>

        <div v-show="expanded.has(name)" class="force-detail">
          <div class="seal-line" aria-hidden="true">══════════ 情报简报 ══════════</div>
          <label>
            <span>近期行动</span>
            <textarea v-if="editing" v-model="force.近期行动" class="form-textarea" rows="2"></textarea>
            <p v-else class="telegram">{{ force.近期行动 || '无' }}</p>
          </label>
          <label>
            <span>外交关系</span>
            <textarea v-if="editing" v-model="force.外交关系" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ force.外交关系 || '无' }}</p>
          </label>
          <label>
            <span>内部矛盾</span>
            <textarea v-if="editing" v-model="force.内部矛盾" class="form-textarea" rows="2"></textarea>
            <p v-else>{{ force.内部矛盾 || '无' }}</p>
          </label>
          <label>
            <span>内部分支</span>
            <textarea v-if="editing" v-model="force.内部分支" class="form-textarea" rows="3"></textarea>
            <p v-else>{{ force.内部分支 || '无' }}</p>
          </label>
        </div>
      </article>
    </section>

    <button v-if="editing" type="button" class="add-btn" @click="addForce">＋ 添加外部势力</button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  外部势力了解程度参考列表,
  外部势力态度参考列表,
  我方外交策略参考列表,
} from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);
const expanded = reactive(new Set<string>());

watch(
  () => store.data,
  data => {
    data.外部势力 ??= {};
  },
  { immediate: true, once: true },
);
const 外部势力 = computed<Record<string, any>>(() => store.data.外部势力 ?? {});
const forceEntries = computed(() => Object.entries(外部势力.value) as [string, any][]);

const 态度选项 = [...外部势力态度参考列表];
const 了解选项 = [...外部势力了解程度参考列表];
const 策略选项 = [...我方外交策略参考列表];

function toggle(name: string) {
  if (expanded.has(name)) expanded.delete(name);
  else expanded.add(name);
}

function attitudeColor(value: string): string {
  const map: Record<string, string> = {
    未察觉: 'var(--qyc-ink-faint)',
    怀疑: 'var(--qyc-warn)',
    关注: 'var(--qyc-info)',
    敌对: 'var(--qyc-danger)',
    合作: 'var(--qyc-ok)',
    利用: 'var(--qyc-accent)',
  };
  return map[value] ?? 'var(--qyc-ink-dim)';
}

/** 从势力名称中提取开头的旗标 Emoji；无匹配时返回 ▯ */
function flagEmoji(name: string): string {
  // 匹配国旗 Emoji（双字母地区指示符）或常见旗帜符号
  const flag = name.match(/[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F3F4}\u{1F3F3}\u{1F3C1}\u{1F6A9}\u{1F38C}]/u);
  return flag?.[0] ?? '▯';
}

function attitudeStyle(value: string): Record<string, string> {
  const color = attitudeColor(value);
  return {
    backgroundColor: color,
    color: 'var(--qyc-paper-light)',
    borderColor: color,
  };
}

function renameForce(oldKey: string, newKey: string) {
  const next = newKey.trim();
  if (!next || next === oldKey || 外部势力.value[next]) return;
  外部势力.value[next] = 外部势力.value[oldKey];
  delete 外部势力.value[oldKey];
  if (expanded.has(oldKey)) {
    expanded.delete(oldKey);
    expanded.add(next);
  }
}

function removeForce(name: string) {
  if (!confirm(`确认删除外部势力「${name}」？`)) return;
  delete 外部势力.value[name];
  expanded.delete(name);
}

function addForce() {
  const name = `新势力 ${forceEntries.value.length + 1}`;
  外部势力.value[name] = {
    对穿越者态度: '未察觉',
    对穿越者了解程度: '一无所知',
    在当地影响力: 0,
    近期行动: '暂无',
    内部矛盾: '暂无',
    我方外交策略: '观望',
    外交关系: '无',
    内部分支: '暂无',
  };
  expanded.add(name);
}
</script>

<style lang="scss" scoped>
.external-panel {
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
.relation-table,
.add-btn,
.empty-hint {
  position: relative;
  z-index: 1;
}

.panel-header,
.force-title {
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
  min-width: 0;
  color: var(--qyc-vermilion);
  font-size: 15px;
}

.relation-table {
  display: grid;
  gap: 10px;
}

.force-card {
  position: relative;
  z-index: 1;
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  padding: 10px;
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
}

.force-emblem {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.matrix-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.matrix-row span,
.force-detail span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.matrix-row b,
.pill {
  display: inline-block;
  color: var(--qyc-ink);
  font-size: 13px;
}

.pill.solid {
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 999px;
  font-weight: 800;
}

.strategy {
  color: var(--qyc-info);
}

.influence-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
}

.influence-bar {
  position: relative;
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--qyc-paper-dark);
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 9px,
    rgba(122, 101, 80, 0.4) 9px,
    rgba(122, 101, 80, 0.4) 10px
  );
}

.influence-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--qyc-info), var(--qyc-vermilion));
}

.influence-tick {
  flex: 0 0 auto;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  font-weight: 800;
}

.force-detail {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  border-top: 2px dashed var(--qyc-vermilion);
  padding-top: 10px;
}

.seal-line {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-align: center;
  opacity: 0.7;
}

.force-detail p {
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.5;
}

.force-detail .telegram {
  font-family: var(--qyc-font-mono);
  letter-spacing: 0.04em;
}

.edit-btn,
.add-btn,
.danger-btn,
.collapse-btn {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
  cursor: pointer;
}

.collapse-btn {
  width: 28px;
  padding: 5px 0;
}

.edit-btn.active,
.add-btn:hover {
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
  border: 1px dashed var(--qyc-line);
  border-radius: 10px;
  padding: 12px;
  color: var(--qyc-ink-faint);
  text-align: center;
}

@media (max-width: 360px) {
  .matrix-row {
    grid-template-columns: 1fr;
  }
}
</style>
