<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="char-modal" @click.stop>
        <header class="modal-header">
          <div class="modal-title">👤 {{ 名 }} · 角色档案</div>
          <div class="header-actions">
            <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
              {{ editing ? '✓ 完成' : '✎ 编辑' }}
            </button>
            <button type="button" class="close-btn" @click="emit('close')">✕</button>
          </div>
        </header>

        <div v-if="!char" class="empty-hint">未找到该角色数据</div>

        <section v-else class="detail-grid">
          <!-- 姓名 -->
          <div class="detail-item">
            <span class="detail-label">姓名</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.姓名 || '—' }}</span>
            </template>
            <input v-else v-model="char.姓名" type="text" class="form-input" />
          </div>

          <!-- 性别 -->
          <div class="detail-item">
            <span class="detail-label">性别</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.性别 || '—' }}</span>
            </template>
            <select v-else v-model="char.性别" class="form-select">
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <!-- 年龄 -->
          <div class="detail-item">
            <span class="detail-label">年龄</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.年龄 ?? '—' }}</span>
            </template>
            <input v-else v-model.number="char.年龄" type="number" min="0" class="form-input" />
          </div>

          <!-- 当前职务 -->
          <div class="detail-item">
            <span class="detail-label">当前职务</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.当前职务 || '—' }}</span>
            </template>
            <input v-else v-model="char.当前职务" type="text" class="form-input" />
          </div>

          <!-- 当前位置 -->
          <div class="detail-item">
            <span class="detail-label">当前位置</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.当前位置 || '—' }}</span>
            </template>
            <input v-else v-model="char.当前位置" type="text" class="form-input" />
          </div>

          <!-- 当前活动 -->
          <div class="detail-item detail-item--full">
            <span class="detail-label">当前活动</span>
            <template v-if="!editing">
              <span class="detail-value">{{ char.当前活动 || '—' }}</span>
            </template>
            <input v-else v-model="char.当前活动" type="text" class="form-input" />
          </div>

          <!-- 人身安全 -->
          <div class="detail-item">
            <span class="detail-label">人身安全</span>
            <template v-if="!editing">
              <span class="detail-value" :style="{ color: safetyColor }">{{ char.人身安全 || '—' }}</span>
            </template>
            <div v-else class="edit-combo">
              <select v-model="char.人身安全" class="form-select">
                <option value="" disabled>选择…</option>
                <option v-for="opt in 人身安全选项" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <input
                v-model="安全自定义"
                type="text"
                class="form-input"
                placeholder="或自定义…"
                @input="onSafetyCustom"
              />
            </div>
          </div>

          <!-- 群友专属：关系动态 -->
          <template v-if="is群友">
            <div class="detail-item detail-item--full">
              <span class="detail-label">关系动态</span>
              <template v-if="!editing">
                <span class="detail-value">{{ char.关系动态 || '—' }}</span>
              </template>
              <textarea v-else v-model="char.关系动态" class="form-textarea" rows="2" />
            </div>
          </template>

          <!-- 非群友专属：来源 + 态度 -->
          <template v-else>
            <div class="detail-item">
              <span class="detail-label">来源</span>
              <template v-if="!editing">
                <span class="detail-value">{{ char.来源 || '—' }}</span>
              </template>
              <input v-else v-model="char.来源" type="text" class="form-input" />
            </div>
            <div class="detail-item detail-item--full">
              <span class="detail-label">对穿越者态度</span>
              <template v-if="!editing">
                <span class="detail-value">{{ char.对穿越者态度 || '—' }}</span>
              </template>
              <textarea v-else v-model="char.对穿越者态度" class="form-textarea" rows="2" />
            </div>
          </template>

          <!-- 履历 -->
          <div class="detail-item detail-item--full">
            <div class="history-head">
              <span class="detail-label">履历</span>
              <button v-if="editing" type="button" class="mini-btn" @click="addHistory">＋ 添加履历</button>
            </div>
            <template v-if="!editing">
              <ul v-if="履历.length" class="history-view">
                <li v-for="(item, idx) in 履历" :key="idx">
                  <span class="hv-time">{{ item.时间 }}</span>
                  <span class="hv-event">{{ item.事件 }}</span>
                </li>
              </ul>
              <span v-else class="detail-value detail-value--dim">暂无履历记录</span>
            </template>
            <div v-else>
              <div v-for="(item, idx) in 履历" :key="idx" class="history-edit-row">
                <input v-model="item.时间" type="text" class="form-input form-input--time" placeholder="时间" />
                <input v-model="item.事件" type="text" class="form-input form-input--event" placeholder="事件" />
                <input v-model="item.来源" type="text" class="form-input form-input--src" placeholder="来源" />
                <button type="button" class="mini-btn mini-btn--danger" @click="removeHistory(idx)">✕</button>
              </div>
            </div>
          </div>

          <!-- 删除（仅编辑模式） -->
          <div v-if="editing" class="detail-item detail-item--full danger-zone">
            <button type="button" class="danger-btn" @click="onDelete">🗑 删除该角色</button>
          </div>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 人身安全参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';

const props = defineProps<{
  名: string;
  is群友: boolean;
  char: any;
}>();
const emit = defineEmits<{ close: [] }>();

const store = useDataStore() as any;
const editing = ref(false);

const 人身安全选项 = [...人身安全参考列表];
const 安全自定义 = ref('');

// 人身安全色阶（供只读模式显示）
const safetyColor = computed(() => {
  const v = props.char?.人身安全 || '';
  if (['已死亡', '危险', '失踪'].some(k => v.includes(k))) return 'var(--qyc-danger)';
  if (v.includes('需要医护')) return 'var(--qyc-warn)';
  if (v === '受伤') return '#b8a016';
  if (v === '安全') return 'var(--qyc-ok)';
  return 'var(--qyc-ink-faint)';
});

watch(
  () => props.char,
  c => {
    if (!c) return;
    const cur = c.人身安全 || '';
    安全自定义.value = 人身安全选项.includes(cur) ? '' : cur;
  },
  { immediate: true },
);

function onSafetyCustom() {
  if (props.char && 安全自定义.value) {
    props.char.人身安全 = 安全自定义.value;
  }
}

const 履历 = computed<any[]>(() => props.char?.履历 ?? []);

function addHistory() {
  if (!props.char) return;
  if (!Array.isArray(props.char.履历)) props.char.履历 = [];
  props.char.履历.push({
    时间: store.data?.世界?.当前日期 || '1905-05-10',
    事件: '',
    来源: 'GM',
  });
}

function removeHistory(idx: number) {
  if (!props.char?.履历) return;
  props.char.履历.splice(idx, 1);
}

function onDelete() {
  if (!confirm(`确认删除角色「${props.名}」？此操作不可撤销。`)) return;
  const 表 = store.data?.[props.is群友 ? '群友角色' : '非群友角色'];
  if (表) delete 表[props.名];
  emit('close');
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

.char-modal {
  width: min(480px, 92vw);
  max-height: 82vh;
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

.detail-value {
  color: var(--qyc-ink);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}

.close-btn {
  height: 28px;
  width: 28px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.close-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: var(--qyc-ink-faint);
  font-size: 13px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
  padding: 12px 14px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item--full {
  grid-column: 1 / -1;
}

.detail-label {
  color: var(--qyc-ink-faint);
  font-size: 12px;
  font-weight: 600;
}

.form-input,
.form-select {
  height: 28px;
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  padding: 0 8px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--qyc-vermilion);
}

.form-select {
  padding: 0 6px;
  cursor: pointer;
}

.form-textarea {
  border: 1px solid var(--qyc-line);
  border-radius: 6px;
  background: var(--qyc-paper);
  color: var(--qyc-ink);
  font-family: var(--qyc-font-ui);
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s ease;
}

.form-textarea:focus {
  border-color: var(--qyc-vermilion);
}

.edit-combo {
  display: flex;
  gap: 4px;
}

.edit-combo .form-select {
  flex: 0 0 90px;
}

.edit-combo .form-input {
  flex: 1 1 auto;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mini-btn {
  height: 24px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink-dim);
  font-size: 11px;
  padding: 0 8px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.mini-btn:hover {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.mini-btn--danger:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
}

.history-edit-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.form-input--time {
  flex: 0 0 90px;
}

.form-input--event {
  flex: 1 1 auto;
}

.form-input--src {
  flex: 0 0 60px;
}

.danger-zone {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--qyc-line);
}

.danger-btn {
  height: 30px;
  border: 1px solid var(--qyc-danger);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-danger);
  font-size: 12px;
  font-weight: 700;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.danger-btn:hover {
  background: rgba(178, 34, 34, 0.08);
}

/* ── 只读履历列表 ── */
.history-view {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}

.history-view li {
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--qyc-ink-dim);
}

.hv-time {
  flex-shrink: 0;
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
}

.hv-event {
  word-break: break-all;
}

.detail-value--dim {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}
</style>
