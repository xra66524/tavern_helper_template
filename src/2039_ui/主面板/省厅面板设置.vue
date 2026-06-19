<template>
  <Teleport to="body">
    <div class="modal-mask" @click="handleClose">
      <article class="settings-modal" @click.stop>
        <header class="modal-header">
          <div class="modal-title">⚙️ 省厅面板设置</div>
          <button type="button" @click="handleClose">✕</button>
        </header>

        <div class="modal-body">
          <!-- 📊 总览条阈值 -->
          <section class="settings-section">
            <h3>📊 总览条阈值</h3>
            <div class="threshold-grid">
              <label class="threshold-item">
                <span class="th-label">停摆警戒阈值</span>
                <span class="th-control">
                  <button @click="dec('停摆警戒阈值')">−</button>
                  <input v-model.number="draft.停摆警戒阈值" type="number" min="0" max="30" />
                  <button @click="inc('停摆警戒阈值')">+</button>
                </span>
                <span class="th-hint">停摆 ≥N 触发警告</span>
              </label>
              <label class="threshold-item">
                <span class="th-label">掌控差警戒阈值</span>
                <span class="th-control">
                  <button @click="dec('掌控差警戒阈值')">−</button>
                  <input v-model.number="draft.掌控差警戒阈值" type="number" min="0" max="100" />
                  <button @click="inc('掌控差警戒阈值')">+</button>
                </span>
                <span class="th-hint">差 &gt;N 触发结论</span>
              </label>
              <label class="threshold-item">
                <span class="th-label">内阁掌控优势阈值</span>
                <span class="th-control">
                  <button @click="dec('内阁掌控优势阈值')">−</button>
                  <input v-model.number="draft.内阁掌控优势阈值" type="number" min="0" max="100" />
                  <button @click="inc('内阁掌控优势阈值')">+</button>
                </span>
                <span class="th-hint">内阁 &gt;N → 有效掌控</span>
              </label>
              <label class="threshold-item">
                <span class="th-label">事务次官完全主导阈值</span>
                <span class="th-control">
                  <button @click="dec('事务次官完全主导阈值')">−</button>
                  <input v-model.number="draft.事务次官完全主导阈值" type="number" min="0" max="100" />
                  <button @click="inc('事务次官完全主导阈值')">+</button>
                </span>
                <span class="th-hint">事务次官 &gt;N → 主导</span>
              </label>
            </div>
          </section>

          <!-- ⚠️ 预警阈值 -->
          <section class="settings-section">
            <h3>⚠️ 预警阈值</h3>
            <div class="threshold-grid">
              <label v-for="item in warningThresholds" :key="item.key" class="threshold-item">
                <span class="th-label">{{ item.label }}</span>
                <span class="th-control">
                  <button @click="dec(item.key)">−</button>
                  <input v-model.number="(draft as any)[item.key]" type="number" min="0" max="100" />
                  <button @click="inc(item.key)">+</button>
                </span>
                <span class="th-hint">{{ item.hint }}</span>
              </label>
            </div>
            <div class="checkbox-group">
              <span class="checkbox-label">启用预警</span>
              <label v-for="key in warningKeys" :key="key" class="checkbox-item">
                <input v-model="draft.启用预警[key]" type="checkbox" />
                {{ key }}
              </label>
            </div>
          </section>

          <!-- 🔄 排序与折叠 -->
          <section class="settings-section">
            <h3>🔄 排序与折叠</h3>
            <div class="inline-controls">
              <label class="inline-item">
                <span>默认排序方式</span>
                <select v-model="draft.默认排序">
                  <option value="掌控度差">掌控度差</option>
                  <option value="关键性">关键性</option>
                  <option value="运作状态">运作状态</option>
                  <option value="内阁掌控度">内阁掌控度</option>
                  <option value="事务次官掌控度">事务次官掌控度</option>
                  <option value="对CSAT态度">对CSAT态度</option>
                  <option value="对美态度">对美态度</option>
                  <option value="派系分组">派系分组</option>
                </select>
              </label>
              <label class="inline-item">
                <span>低频警戒差阈值</span>
                <input v-model.number="draft.低频警戒掌控差阈值" type="number" min="0" max="100" class="small-input" />
              </label>
              <label class="inline-item">
                <span>手机端默认折叠</span>
                <select v-model="draft.手机端默认全部折叠">
                  <option :value="true">是</option>
                  <option :value="false">否</option>
                </select>
              </label>
            </div>
          </section>

          <!-- 🎨 派系颜色 -->
          <section class="settings-section">
            <h3>🎨 派系颜色</h3>
            <div class="color-grid">
              <div v-for="(color, name) in draft.派系颜色映射" :key="name" class="color-row">
                <span class="color-swatch" :style="{ background: color }"></span>
                <span class="color-name">{{ name }}</span>
                <input
                  class="color-picker"
                  type="color"
                  :value="color"
                  @input="draft.派系颜色映射[name] = ($event.target as HTMLInputElement).value"
                />
                <span class="color-hex">{{ color }}</span>
              </div>
            </div>
          </section>

          <!-- 🔗 省厅阁僚关键词映射 -->
          <section class="settings-section">
            <h3>🔗 省厅 ↔ 阁僚关键词映射</h3>
            <div class="map-grid">
              <div v-for="(_keyword, ministry) in draft.省厅阁僚关键词映射" :key="ministry" class="map-row">
                <span class="map-name">{{ ministry }}</span>
                <span>→</span>
                <input v-model="draft.省厅阁僚关键词映射[ministry]" type="text" class="map-input" />
              </div>
            </div>
          </section>
        </div>

        <!-- 底部按钮 -->
        <footer class="modal-footer">
          <button type="button" class="btn-reset" @click="resetToDefaults">重置为默认值</button>
          <button type="button" class="btn-save" @click="saveConfig">保存配置</button>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, watch } from 'vue';
import { use省厅面板配置 } from './use省厅面板配置';
import type { 省厅面板配置类型 } from './省厅面板默认配置';
import { 省厅面板默认配置 } from './省厅面板默认配置';

const { config } = use省厅面板配置();

const emit = defineEmits<{ close: [] }>();

/** 本地编辑的配置副本 */
const draft = reactive<省厅面板配置类型>(JSON.parse(JSON.stringify({ ...省厅面板默认配置, ...config.value })));

// 同步外部配置变更
watch(
  () => config.value,
  val => {
    Object.assign(draft, JSON.parse(JSON.stringify({ ...省厅面板默认配置, ...val })));
  },
  { deep: true },
);

const warningThresholds = [
  { key: '架空警戒阈值', label: '架空警戒阈值', hint: '内阁掌控 <N 时预警' },
  { key: '官僚锁死阈值', label: '官僚锁死阈值', hint: '事务次官 >N 时预警' },
  { key: 'CSAT渗透阈值', label: 'CSAT渗透阈值', hint: '对CSAT >N 时预警' },
  { key: '美国渗透阈值', label: '美国渗透阈值', hint: '对美 >N 时预警' },
  { key: '派系孤立阈值', label: '派系孤立阈值', hint: '派系均值 <N 时预警' },
] as const;

const warningKeys = ['命脉失守', '完全架空', '官僚锁死', 'CSAT渗透', '美国渗透', '派系孤立'] as const;

function inc(key: string) {
  const val = (draft as any)[key];
  if (typeof val === 'number') (draft as any)[key] = Math.min(100, val + 1);
}

function dec(key: string) {
  const val = (draft as any)[key];
  if (typeof val === 'number') (draft as any)[key] = Math.max(0, val - 1);
}

function resetToDefaults() {
  Object.assign(draft, JSON.parse(JSON.stringify(省厅面板默认配置)));
}

async function saveConfig() {
  const payload = JSON.parse(JSON.stringify(draft));
  try {
    const mvu_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
    _.set(mvu_data, 'stat_data.世界.省厅面板配置', payload);
    _.set(mvu_data, 'stat_data.世界.省厅面板配置.上次修改时间', new Date().toISOString());
    await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getCurrentMessageId() });
  } catch {
    // MVU API 不可用时静默失败
  }
  emit('close');
}

function handleClose() {
  emit('close');
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => document.removeEventListener('keydown', onKey));
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.54);
  backdrop-filter: blur(4px);
}

.settings-modal {
  width: min(460px, 94vw);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.97), rgba(2, 6, 23, 0.99)), #0b1121;
  color: #cbd5e1;
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.55);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.96);
  flex-shrink: 0;

  button {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(2, 6, 23, 0.5);
    color: #94a3b8;
    font-size: 14px;
    cursor: pointer;
  }
}

.modal-title {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 900;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
}

.settings-section {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);

  h3 {
    margin: 0 0 8px;
    color: #e2e8f0;
    font-size: 13px;
    letter-spacing: 0.04em;
  }
}

// ── 阈值网格 ──
.threshold-grid {
  display: grid;
  gap: 6px;
}

.threshold-item {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  font-size: 12px;
}

.th-label {
  color: #94a3b8;
  font-weight: 800;
}

.th-control {
  display: flex;
  align-items: center;
  gap: 2px;

  button {
    width: 22px;
    height: 22px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(2, 6, 23, 0.5);
    color: #94a3b8;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
  }

  input {
    width: 44px;
    padding: 2px 4px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(2, 6, 23, 0.5);
    color: #e2e8f0;
    font-size: 12px;
    text-align: center;
  }
}

.th-hint {
  color: #64748b;
  font-size: 11px;
}

// ── 复选框组 ──
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.3);
}

.checkbox-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  margin-right: 4px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #cbd5e1;
  cursor: pointer;
}

// ── 内联控件 ──
.inline-controls {
  display: grid;
  gap: 8px;
}

.inline-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;

  select,
  .small-input {
    padding: 3px 6px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(2, 6, 23, 0.5);
    color: #e2e8f0;
    font-size: 11px;
    outline: none;
  }

  .small-input {
    width: 60px;
    text-align: center;
  }
}

// ── 颜色网格 ──
.color-grid {
  display: grid;
  gap: 5px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 12px;
}

.color-swatch {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 3px;
  flex-shrink: 0;
}

.color-name {
  flex: 1;
  min-width: 0;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-picker {
  width: 28px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.color-hex {
  width: 58px;
  color: #64748b;
  font-size: 11px;
  font-family: monospace;
}

// ── 映射网格 ──
.map-grid {
  display: grid;
  gap: 4px;
}

.map-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}

.map-name {
  width: 80px;
  color: #94a3b8;
  font-weight: 800;
  flex-shrink: 0;
}

.map-input {
  flex: 1;
  padding: 3px 5px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.5);
  color: #e2e8f0;
  font-size: 11px;
  outline: none;
}

// ── 底部按钮 ──
.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.96);
  flex-shrink: 0;
}

.btn-reset {
  padding: 6px 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(2, 6, 23, 0.5);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    color: #e2e8f0;
  }
}

.btn-save {
  padding: 6px 16px;
  border: 1px solid #3b82f6;
  background: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: rgba(59, 130, 246, 0.28);
  }
}

@container main-panel (max-width: 430px) {
  .settings-modal {
    width: 95vw;
    max-height: 85vh;
  }
}
</style>
