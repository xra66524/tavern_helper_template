<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="institution-modal" @click.stop>
        <header class="modal-header">
          <div class="modal-title">🏛️ {{ 机构名 }} · 制度详情</div>
          <div class="header-actions">
            <button v-if="hasDetail" type="button" class="edit-btn" :class="{ active: editing }" @click="toggleEdit">
              {{ editing ? '✓ 完成' : '✎ 编辑' }}
            </button>
            <button type="button" class="close-btn" @click="emit('close')">✕</button>
          </div>
        </header>

        <div v-if="!hasDetail" class="empty-hint">该机构暂无制度详情（建政后由 AI 按剧情补值）</div>

        <section v-else class="detail-grid">
          <div v-for="field in 制度字段" :key="field.key" class="detail-item">
            <span class="detail-label">{{ field.label }}</span>
            <template v-if="!editing">
              <span class="detail-value">{{ 制度详情?.[field.key] || '—' }}</span>
            </template>
            <template v-else>
              <div v-if="field.options" class="edit-combo">
                <select v-model="制度详情[field.key]" class="form-select">
                  <option value="" disabled>选择…</option>
                  <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input
                  v-model="自定义[field.key]"
                  type="text"
                  class="form-input"
                  placeholder="或自定义…"
                  @input="onCustomInput(field.key)"
                />
              </div>
              <textarea
                v-else
                v-model="制度详情[field.key]"
                class="form-textarea"
                rows="2"
                :placeholder="`请输入${field.label}`"
              />
            </template>
          </div>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  保密等级参考列表,
  所属体系参考列表,
  机构性质参考列表,
  机构级别参考列表,
  职级参考列表,
  领导体制参考列表,
} from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const props = defineProps<{ 机构名: string }>();
const emit = defineEmits<{ close: [] }>();

const store = useDataStore();
const 机构 = computed(() => store.data.组织结构?.机构?.[props.机构名]);
const 制度详情 = computed(() => 机构.value?.制度详情 ?? null);
const hasDetail = computed(() => !!制度详情.value);

const editing = ref(false);

// 12 字段（对应 机构制度详情Schema）
const 制度字段: Array<{ key: string; label: string; options?: readonly string[] }> = [
  { key: '所属体系', label: '所属体系', options: 所属体系参考列表 },
  { key: '机构性质', label: '机构性质', options: 机构性质参考列表 },
  { key: '级别', label: '级别', options: 机构级别参考列表 },
  { key: '职务体系', label: '职务体系' },
  { key: '领导体制', label: '领导体制', options: 领导体制参考列表 },
  { key: '上级业务主管', label: '上级业务主管' },
  { key: '决策规则', label: '决策规则' },
  { key: '任命权限', label: '任命权限' },
  { key: '职级', label: '职级', options: 职级参考列表 },
  { key: '议事协调备注', label: '议事协调备注' },
  { key: '请示报告要求', label: '请示报告要求' },
  { key: '保密等级', label: '保密等级', options: 保密等级参考列表 },
];

// 自定义输入双轨：仅对带 options 的字段生效
const 自定义 = reactive<Record<string, string>>({});

watch(
  editing,
  v => {
    if (!v) return;
    // 进入编辑模式时，把不在参考列表中的当前值填入自定义框
    for (const field of 制度字段) {
      if (!field.options) continue;
      const cur = (制度详情.value?.[field.key] as string) ?? '';
      自定义[field.key] = field.options.includes(cur as never) ? '' : cur;
    }
  },
  { immediate: true },
);

function onCustomInput(key: string) {
  const val = 自定义[key];
  if (val && 制度详情.value) {
    制度详情.value[key] = val;
  }
}

function toggleEdit() {
  editing.value = !editing.value;
}
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

.institution-modal {
  width: min(440px, 92vw);
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
  font-size: 16px;
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

.empty-hint {
  padding: 18px 14px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  padding: 6px 14px 12px;
}

.detail-item {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 7px 0;
  border-bottom: 1px dotted var(--qyc-line);

  &:last-child {
    border-bottom: 0;
  }
}

.detail-label {
  color: var(--qyc-ink-faint);
  font-size: 12px;
  letter-spacing: 0.04em;
  padding-top: 2px;
}

.detail-value {
  color: var(--qyc-ink);
  font-size: 13px;
  font-weight: 600;
  word-break: break-word;
  white-space: pre-wrap;
}

.edit-combo {
  display: flex;
  gap: 4px;
}

.form-input,
.form-select {
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
  min-width: 0;
  transition: border-color 0.15s ease;
}

.form-select {
  padding: 0 6px;
  cursor: pointer;
  flex: 0 0 auto;
  min-width: 96px;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--qyc-vermilion);
}

.form-textarea {
  width: 100%;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.form-textarea:focus {
  border-color: var(--qyc-vermilion);
}
</style>
