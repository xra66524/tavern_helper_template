<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="vehicle-modal" @click.stop>
        <header class="modal-header">
          <div class="modal-title">🚛 基地车档案</div>
          <div class="header-actions">
            <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
              {{ editing ? '✓ 完成' : '✎ 编辑' }}
            </button>
            <button type="button" class="close-btn" @click="emit('close')">✕</button>
          </div>
        </header>

        <!-- 位置与机动 -->
        <section class="detail-section">
          <h3>📍 位置与机动</h3>
          <template v-if="!editing">
            <div class="info-row">
              <span class="info-label">当前位置</span>
              <span class="info-value">{{ v.当前位置 || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">移动状态</span>
              <span class="info-value" :style="{ color: colorForStatus(v.移动状态) }">{{ v.移动状态 || '—' }}</span>
            </div>
          </template>
          <template v-else>
            <label class="edit-field">
              <span class="edit-label">当前位置</span>
              <input v-model="v.当前位置" type="text" class="form-input" placeholder="如 当涂县长江南岸" />
            </label>
            <label class="edit-field">
              <span class="edit-label">移动状态</span>
              <div class="edit-combo">
                <select v-model="v.移动状态" class="form-select">
                  <option value="" disabled>选择状态…</option>
                  <option v-for="opt in 移动状态选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-model="移动状态自定义" type="text" class="form-input" placeholder="或自定义…" />
              </div>
            </label>
          </template>
        </section>

        <!-- 能源系统 -->
        <section class="detail-section">
          <h3>⚡ 能源系统</h3>
          <template v-if="!editing">
            <div class="info-row">
              <span class="info-label">反应堆功率等级</span>
              <span class="info-value">{{ v.反应堆功率等级 || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">反应堆状态</span>
              <span class="info-value" :style="{ color: colorForStatus(v.反应堆状态) }">{{ v.反应堆状态 || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">配电系统负载</span>
              <span class="info-value" :style="{ color: loadColor }">{{ v.配电系统负载 ?? '—' }}%</span>
            </div>
            <div class="info-row">
              <span class="info-label">配电系统状态</span>
              <span class="info-value" :style="{ color: colorForStatus(v.配电系统状态) }">{{
                v.配电系统状态 || '—'
              }}</span>
            </div>
          </template>
          <template v-else>
            <label class="edit-field">
              <span class="edit-label">反应堆功率等级</span>
              <div class="edit-combo">
                <select v-model="v.反应堆功率等级" class="form-select">
                  <option value="" disabled>选择…</option>
                  <option v-for="opt in 功率等级选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-model="功率等级自定义" type="text" class="form-input" placeholder="或自定义…" />
              </div>
            </label>
            <label class="edit-field">
              <span class="edit-label">反应堆状态</span>
              <div class="edit-combo">
                <select v-model="v.反应堆状态" class="form-select">
                  <option value="" disabled>选择…</option>
                  <option v-for="opt in 反应堆状态选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-model="反应堆状态自定义" type="text" class="form-input" placeholder="或自定义…" />
              </div>
            </label>
            <label class="edit-field">
              <span class="edit-label">配电系统负载 (%)</span>
              <input v-model.number="v.配电系统负载" type="number" min="0" max="100" class="form-input" />
            </label>
            <label class="edit-field">
              <span class="edit-label">配电系统状态</span>
              <div class="edit-combo">
                <select v-model="v.配电系统状态" class="form-select">
                  <option value="" disabled>选择…</option>
                  <option v-for="opt in 配电状态选项" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-model="配电状态自定义" type="text" class="form-input" placeholder="或自定义…" />
              </div>
            </label>
          </template>
        </section>

        <!-- 外骨骼 -->
        <section class="detail-section">
          <h3>🦾 外骨骼</h3>
          <template v-if="!editing">
            <div class="info-row">
              <span class="info-label">现状</span>
              <span class="info-value">{{ v.外骨骼现状 || '—' }}</span>
            </div>
          </template>
          <template v-else>
            <label class="edit-field">
              <span class="edit-label">现状</span>
              <input
                v-model="v.外骨骼现状"
                type="text"
                class="form-input"
                placeholder="如 10具可用，磁体/电芯不可补货"
              />
            </label>
          </template>
        </section>

        <!-- 核心设备 -->
        <section class="detail-section">
          <h3>🛠️ 核心设备</h3>
          <template v-if="!editing">
            <div v-if="核心设备列表.length === 0" class="empty-hint">暂无核心设备记录</div>
            <div v-for="[名, 设备] in 核心设备列表" :key="名" class="list-row">
              <span class="list-name">{{ 名 }}</span>
              <span class="list-badge" :style="badgeStyle(设备.状态)">{{ 设备.状态 || '—' }}</span>
              <span v-if="设备.备注" class="list-note">{{ 设备.备注 }}</span>
            </div>
          </template>
          <template v-else>
            <div class="edit-record-actions">
              <button type="button" class="add-row-btn" @click="添加核心设备">＋ 添加设备</button>
            </div>
            <div v-for="([名, 设备], idx) in 核心设备列表" :key="名 + '-' + idx" class="edit-record-row">
              <input
                :value="设备编辑键[idx]"
                @change="重命名核心设备(idx, ($event.target as HTMLInputElement).value)"
                type="text"
                class="form-input form-input--key"
                placeholder="设备名"
              />
              <select v-model="设备.状态" class="form-select form-select--sm">
                <option v-for="opt in 设备状态选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input v-model="设备.备注" type="text" class="form-input form-input--note" placeholder="备注" />
              <button type="button" class="remove-row-btn" @click="删除核心设备(idx)" title="删除">✕</button>
            </div>
          </template>
        </section>

        <!-- 物资储备 -->
        <section class="detail-section">
          <h3>📦 物资储备</h3>
          <template v-if="!editing">
            <div v-if="物资列表.length === 0" class="empty-hint">暂无物资记录</div>
            <div v-for="[名, 物资] in 物资列表" :key="名" class="list-row">
              <span class="list-name">{{ 名 }}</span>
              <span class="list-badge" :style="badgeStyle(物资.储备水平)">{{ 物资.储备水平 || '—' }}</span>
              <span v-if="物资.备注" class="list-note">{{ 物资.备注 }}</span>
            </div>
          </template>
          <template v-else>
            <div class="edit-record-actions">
              <button type="button" class="add-row-btn" @click="添加物资">＋ 添加物资</button>
            </div>
            <div v-for="([名, 物资], idx) in 物资列表" :key="名 + '-' + idx" class="edit-record-row">
              <input
                :value="物资编辑键[idx]"
                @change="重命名物资键(idx, ($event.target as HTMLInputElement).value)"
                type="text"
                class="form-input form-input--key"
                placeholder="物资名"
              />
              <select v-model="物资.储备水平" class="form-select form-select--sm">
                <option v-for="opt in 储备水平选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input v-model="物资.备注" type="text" class="form-input form-input--note" placeholder="备注" />
              <button type="button" class="remove-row-btn" @click="删除物资(idx)" title="删除">✕</button>
            </div>
          </template>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  反应堆功率等级参考列表,
  反应堆状态参考列表,
  基地车移动状态参考列表,
  核心设备状态参考列表,
  物资储备水平参考列表,
  配电系统状态参考列表,
} from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const emit = defineEmits<{ close: [] }>();

const store = useDataStore();
const v = computed(() => store.data.基地车);

const 核心设备列表 = computed(() => Object.entries(v.value.核心设备状态 ?? {}));
const 物资列表 = computed(() => Object.entries(v.value.物资储备 ?? {}));

const editing = ref(false);

// ── 选项列表 ──
const 移动状态选项 = [...基地车移动状态参考列表];
const 功率等级选项 = [...反应堆功率等级参考列表];
const 反应堆状态选项 = [...反应堆状态参考列表];
const 配电状态选项 = [...配电系统状态参考列表];
const 设备状态选项 = [...核心设备状态参考列表];
const 储备水平选项 = [...物资储备水平参考列表];

// ── 自定义值同步 ──
const 移动状态自定义 = ref('');
const 功率等级自定义 = ref('');
const 反应堆状态自定义 = ref('');
const 配电状态自定义 = ref('');

watch(移动状态自定义, v => v && (store.data.基地车.移动状态 = v));
watch(功率等级自定义, v => v && (store.data.基地车.反应堆功率等级 = v));
watch(反应堆状态自定义, v => v && (store.data.基地车.反应堆状态 = v));
watch(配电状态自定义, v => v && (store.data.基地车.配电系统状态 = v));

watch(editing, v => {
  if (v) {
    const cur = (name: string, list: readonly string[]) => (list.includes(name as any) ? '' : name);
    移动状态自定义.value = cur(store.data.基地车.移动状态, 移动状态选项);
    功率等级自定义.value = cur(store.data.基地车.反应堆功率等级, 功率等级选项);
    反应堆状态自定义.value = cur(store.data.基地车.反应堆状态, 反应堆状态选项);
    配电状态自定义.value = cur(store.data.基地车.配电系统状态, 配电状态选项);
  }
});

// ── 设备/物资编辑临时键名 ──
const 设备编辑键 = ref<string[]>([]);
const 物资编辑键 = ref<string[]>([]);

watch(
  核心设备列表,
  list => {
    设备编辑键.value = list.map(([k]) => k);
  },
  { immediate: true },
);

watch(
  物资列表,
  list => {
    物资编辑键.value = list.map(([k]) => k);
  },
  { immediate: true },
);

function 添加核心设备() {
  const 设备状态 = v.value.核心设备状态 ?? {};
  const 新名 = `新设备 ${Object.keys(设备状态).length + 1}`;
  设备状态[新名] = { 状态: '正常', 备注: '' };
}

function 删除核心设备(idx: number) {
  const 旧键 = 设备编辑键.value[idx];
  if (旧键) delete v.value.核心设备状态[旧键];
}

function 添加物资() {
  const 储备 = v.value.物资储备 ?? {};
  const 新名 = `新物资 ${Object.keys(储备).length + 1}`;
  储备[新名] = { 储备水平: '充足', 备注: '' };
}

function 删除物资(idx: number) {
  const 旧键 = 物资编辑键.value[idx];
  if (旧键) delete v.value.物资储备[旧键];
}

// 键名变更：直接在底层 record 上重命名，避免循环 watch
function 重命名核心设备(idx: number, 新键: string) {
  if (!新键) return;
  const 设备状态 = v.value.核心设备状态;
  if (!设备状态) return;
  const 旧键 = 设备编辑键.value[idx];
  if (旧键 === 新键 || !旧键) return;
  if (设备状态[新键]) return; // 键名冲突，跳过
  设备状态[新键] = 设备状态[旧键];
  delete 设备状态[旧键];
  设备编辑键.value[idx] = 新键;
}

function 重命名物资键(idx: number, 新键: string) {
  if (!新键) return;
  const 储备 = v.value.物资储备;
  if (!储备) return;
  const 旧键 = 物资编辑键.value[idx];
  if (旧键 === 新键 || !旧键) return;
  if (储备[新键]) return; // 键名冲突，跳过
  储备[新键] = 储备[旧键];
  delete 储备[旧键];
  物资编辑键.value[idx] = 新键;
}

// ── 色阶 ──
function colorForStatus(status: string | undefined) {
  if (!status) return 'var(--qyc-ink-dim)';
  if (/正常|充足|满功率|驻扎|完好/.test(status)) return 'var(--qyc-ok)';
  if (/紧张|降|过载|故障|部分损失|污染风险/.test(status)) return 'var(--qyc-warn)';
  if (/危急|损毁|耗尽|失控|已损失/.test(status)) return 'var(--qyc-danger)';
  return 'var(--qyc-ink-dim)';
}

function badgeStyle(status: string | undefined) {
  const color = colorForStatus(status);
  return { borderColor: color, color };
}

const loadColor = computed(() => {
  const load = v.value.配电系统负载 ?? 0;
  if (load >= 90) return 'var(--qyc-danger)';
  if (load >= 70) return 'var(--qyc-warn)';
  return 'var(--qyc-ok)';
});
</script>

<style lang="scss" scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.54);
  backdrop-filter: blur(4px);
}

.vehicle-modal {
  width: min(420px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 12px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139, 119, 90, 0.04) 2px,
      rgba(139, 119, 90, 0.04) 4px
    ),
    var(--qyc-paper-light);
  color: var(--qyc-ink);
  box-shadow: 0 18px 55px rgba(44, 24, 16, 0.45);
}

.modal-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--qyc-vermilion-faded);
  background: var(--qyc-paper-light);
}

.modal-title {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.edit-btn {
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

.edit-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.edit-btn.active {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  background: rgba(74, 124, 63, 0.06);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.close-btn:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
}

.detail-section {
  padding: 11px 14px;
  border-bottom: 1px dashed var(--qyc-line);

  &:last-child {
    border-bottom: 0;
  }

  h3 {
    margin: 0 0 9px;
    color: var(--qyc-vermilion);
    font-family: var(--qyc-font-title);
    font-size: 14px;
    letter-spacing: 0.06em;
  }
}

.info-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding: 3px 0;
  font-size: 13px;
}

.info-label {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.info-value {
  color: var(--qyc-ink);
  font-weight: 600;
  word-break: break-word;
}

.list-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 8px;
  align-items: center;
  padding: 5px 0;
  border-top: 1px dotted var(--qyc-line);
  font-size: 13px;

  &:first-of-type {
    border-top: 0;
  }
}

.list-name {
  color: var(--qyc-ink);
  font-weight: 600;
}

.list-badge {
  justify-self: end;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 999px;
  padding: 2px 8px;
  font-family: var(--qyc-font-mono);
  font-size: 12px;
}

.list-note {
  grid-column: 1 / -1;
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.empty-hint {
  color: var(--qyc-ink-faint);
  font-size: 13px;
  padding: 4px 0;
}

/* ── 编辑模式 ── */
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 0;
  font-size: 13px;
}

.edit-label {
  color: var(--qyc-ink-faint);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.edit-combo {
  display: flex;
  gap: 4px;
}

.edit-record-actions {
  padding: 4px 0 8px;
}

.add-row-btn {
  height: 28px;
  border: 1px dashed var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: 0 12px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.add-row-btn:hover {
  border-color: var(--qyc-ok);
  color: var(--qyc-ok);
  border-style: solid;
}

.edit-record-row {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
  border-top: 1px dotted var(--qyc-line);
  font-size: 13px;

  &:first-of-type {
    border-top: 0;
  }
}

.remove-row-btn {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.remove-row-btn:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
}

.form-input {
  height: 28px;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  padding: 0 8px;
  outline: none;
  flex: 1;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--qyc-vermilion);
}

.form-input--key {
  flex: 1;
  min-width: 60px;
}

.form-input--note {
  flex: 0.7;
  min-width: 50px;
}

.form-select {
  height: 28px;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  padding: 0 6px;
  outline: none;
  cursor: pointer;
}

.form-select:focus {
  border-color: var(--qyc-vermilion);
}

.form-select--sm {
  min-width: 72px;
  flex: 0 0 auto;
}
</style>
