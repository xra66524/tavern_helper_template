<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="node-modal" @click.stop>
        <header class="modal-header">
          <div>
            <p class="modal-kicker">TECH NODE DOSSIER</p>
            <h2>{{ node.节点名 }}</h2>
          </div>
          <button type="button" class="close-btn" @click="emit('close')">✕</button>
        </header>

        <div class="status-row">
          <span class="status-chip" :class="`status-${node.状态}`">{{ statusIcon }} {{ node.状态 }}</span>
          <span class="branch-chip">{{ node.所属分支 }}</span>
          <span class="days-chip">{{ node.研发总耗时_天 }} 天</span>
        </div>

        <section class="detail-section">
          <h3>📝 节点描述</h3>
          <p class="plain-text">{{ node.描述 || '暂无描述' }}</p>
          <p v-if="node.备注" class="note-text">💬 {{ node.备注 }}</p>
        </section>

        <section class="detail-section">
          <h3>🔗 前置科技链</h3>
          <div v-if="node.前置科技.length === 0" class="empty-hint">无前置科技，可直接启动。</div>
          <ul v-else class="pre-list">
            <li v-for="pre in node.前置科技" :key="pre" :class="{ done: completedNames.includes(pre) }">
              <span>{{ completedNames.includes(pre) ? '✅' : '🔒' }}</span>
              <span>{{ pre }}</span>
            </li>
          </ul>
        </section>

        <section class="detail-section">
          <h3>📊 研发进度</h3>
          <div v-if="node.状态 === '主要' || node.状态 === '次要'" class="progress-block">
            <div class="progress-meta">
              <span>{{ node.状态 }}研究槽 · {{ progress }}%</span>
              <span>预计剩余：{{ remainingDays }} 天</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :class="node.状态 === '主要' ? 'major' : 'minor'"
                :style="{ width: `${progress}%` }"
              />
            </div>
            <div class="start-date">📅 启动：{{ node.启动日期 || '未记录' }}</div>
          </div>
          <div v-else-if="node.状态 === '已完成'" class="complete-box">✅ 已完成并归档</div>
          <div v-else class="empty-hint">
            {{ node.状态 === '可启动' ? '前置已满足，可加入研究槽。' : '前置未满足，暂不可启动。' }}
          </div>
        </section>

        <section class="detail-section">
          <h3>🏷️ 解锁能力</h3>
          <div v-if="node.解锁能力.length" class="ability-list">
            <span v-for="ability in node.解锁能力" :key="ability" class="ability-tag">{{ ability }}</span>
          </div>
          <div v-else class="empty-hint">暂无解锁能力记录</div>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 节点全貌 } from '../../../../src/群友群穿/界面/状态栏/tech_tree_utils';
import { 预计剩余天数 } from '../../../../src/群友群穿/界面/状态栏/tech_tree_utils';

const props = defineProps<{
  node: 节点全貌;
  completedNames: string[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const progress = computed(() => Math.max(0, Math.min(100, Math.round(props.node.研发进度 || 0))));
const remainingDays = computed(() => 预计剩余天数(props.node.节点名, progress.value));
const statusIcon = computed(() => {
  if (props.node.状态 === '已完成') return '✅';
  if (props.node.状态 === '主要') return '🟡';
  if (props.node.状态 === '次要') return '🔵';
  if (props.node.状态 === '可启动') return '🟢';
  return '🔒';
});
</script>

<style lang="scss" scoped>
.modal-mask {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: rgba(26, 14, 8, 0.42);
  backdrop-filter: blur(2px);
}

.node-modal {
  width: min(520px, 100%);
  max-height: 88vh;
  overflow: auto;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 14px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  box-shadow: 0 18px 50px rgba(26, 14, 8, 0.28);
  padding: 14px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--qyc-vermilion-faded);
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.modal-kicker {
  margin: 0 0 4px;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.modal-header h2 {
  margin: 0;
  font-family: var(--qyc-font-title);
  font-size: 20px;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.status-chip,
.branch-chip,
.days-chip {
  border: 1px solid var(--qyc-line);
  border-radius: 999px;
  background: var(--qyc-paper);
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
}

.status-已完成 {
  color: var(--qyc-ok);
  border-color: var(--qyc-ok);
}
.status-主要 {
  color: var(--qyc-warn);
  border-color: var(--qyc-warn);
}
.status-次要 {
  color: var(--qyc-info);
  border-color: var(--qyc-info);
}
.status-可启动 {
  color: var(--qyc-ok);
  border-color: var(--qyc-line-strong);
}
.status-锁定 {
  color: var(--qyc-ink-faint);
}

.detail-section {
  border: 1px solid var(--qyc-line);
  border-radius: 10px;
  background: rgba(242, 232, 213, 0.62);
  padding: 10px;
  margin-top: 8px;
}

.detail-section h3 {
  margin: 0 0 8px;
  color: var(--qyc-vermilion);
  font-size: 14px;
}

.plain-text,
.note-text {
  margin: 0;
  color: var(--qyc-ink-dim);
  font-size: 13px;
  line-height: 1.55;
}

.note-text {
  margin-top: 6px;
  color: var(--qyc-ink-faint);
}
.empty-hint {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.pre-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
}

.pre-list li {
  display: flex;
  gap: 6px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
}

.pre-list li.done {
  color: var(--qyc-ok);
  font-weight: 700;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}

.progress-bar {
  height: 9px;
  overflow: hidden;
  border: 1px solid var(--qyc-line);
  border-radius: 999px;
  background: var(--qyc-paper-dark);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
}

.progress-fill.major {
  background: var(--qyc-warn);
}
.progress-fill.minor {
  background: var(--qyc-info);
}

.start-date {
  margin-top: 6px;
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.complete-box {
  border: 1px solid var(--qyc-ok);
  border-radius: 8px;
  color: var(--qyc-ok);
  font-size: 13px;
  font-weight: 800;
  padding: 8px;
}

.ability-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ability-tag {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink-dim);
  font-size: 12px;
  padding: 4px 8px;
}
</style>
