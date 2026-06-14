<template>
  <div class="status-bar" @click="emit('click')">
    <div class="status-header">
      <div class="title-block">
        <span class="title-mark">2039</span>
        <span class="title-text">政局监测面板</span>
      </div>
      <span class="live-indicator mock">
        <span class="live-dot"></span>
        MOCK
      </span>
    </div>
    <div class="status-console">
      <span class="console-item">
        <span class="console-label">DATE</span>
        <span class="console-value">----.--.--</span>
      </span>
      <span class="console-item">
        <span class="console-label">TIME</span>
        <span class="console-value">--:--</span>
      </span>
      <span class="console-item mode">
        <span class="console-label">MODE</span>
        <span class="console-value">--</span>
      </span>
    </div>
    <div class="status-row-1">
      <span class="phase-tag placeholder">
        <span class="tag-label">阶段</span>
        <strong class="tag-value">--</strong>
      </span>
      <span class="pm-tag placeholder">
        <span class="tag-label">首相</span>
        <strong class="tag-value">--</strong>
      </span>
      <span class="crisis-tag placeholder">
        <span class="tag-label">危机</span>
        <strong class="tag-value">--</strong>
      </span>
    </div>
    <div class="status-matrix">
      <span class="secondary-tag"><span class="s-label">稳定</span> <strong>--</strong></span>
      <span class="secondary-tag"><span class="s-label">外压</span> <strong>--</strong></span>
      <span class="secondary-tag"><span class="s-label">合法</span> <strong>--</strong></span>
      <span class="secondary-tag"><span class="s-label">控制</span> <strong>--</strong></span>
      <span class="secondary-tag economy-tag"><span class="s-label">通胀</span> <strong>--</strong></span>
      <span class="secondary-tag security-tag"><span class="s-label">治安</span> <strong>--</strong></span>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.status-bar {
  position: relative;
  z-index: 1;
  padding: 14px 14px 8px;
  cursor: pointer;
  user-select: none;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  &::after {
    content: '';
    position: absolute;
    bottom: 26px;
    left: 14px;
    right: 14px;
    height: 1px;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.3), transparent);
    pointer-events: none;
  }
}

.title-block {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fef2f2;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
  font-family: 'Georgia', serif;
}

.title-text {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  color: #475569;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &.mock {
    color: #856e3b;
  }
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #64748b;

  .mock & {
    background: #a08c3c;
    animation: breathe 1.8s ease-in-out infinite;
  }
}

// ── 控制台读数行（DATE / TIME / MODE） ──

.status-console {
  display: flex;
  gap: 0;
  align-items: stretch;
  margin-bottom: 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.console-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 5px 6px 4px;
  background: rgba(15, 23, 42, 0.5);
  border-right: 1px solid rgba(148, 163, 184, 0.08);

  &:last-child {
    border-right: none;
  }

  &.mode {
    background: rgba(139, 92, 246, 0.06);
  }
}

.console-label {
  color: #475569;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  .mode & {
    color: #6d5acf;
  }
}

.console-value {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.06em;

  .mode & {
    color: #c4b5fd;
  }
}

// ── 第一行：3 个核心批示 ──

.status-row-1 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

// ── 核心批示标签 ──

.phase-tag,
.pm-tag,
.crisis-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.phase-tag {
  background: rgba(239, 68, 68, 0.12);
  border-left: 3px solid #ef4444;
  color: #fca5a5;
}

.pm-tag {
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid #6366f1;
  color: #a5b4fc;
}

.crisis-tag {
  background: rgba(234, 179, 8, 0.1);
  border-left: 3px solid #eab308;
  color: #fde68a;
}

.tag-label {
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tag-value {
  color: inherit;
  font-size: 12px;
  font-weight: 800;
}

// ── 第二行：2×3 指标矩阵 ──

.status-matrix {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  margin-top: 8px;
}

.secondary-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 7px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.06);
  border-left: 2px solid #475569;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;

  .s-label {
    opacity: 0.65;
  }

  strong {
    color: #94a3b8;
    font-weight: 700;
    font-family: 'Consolas', 'Courier New', monospace;
    letter-spacing: 0.04em;
  }

  &.economy-tag {
    border-left-color: #947d2a;

    strong {
      color: #cbb840;
    }
  }

  &.security-tag {
    border-left-color: #2a6b3a;

    strong {
      color: #6dbd82;
    }
  }
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

// 手机端：缩小字号、减间距，所有信息必须全部可见
@container main-panel (max-width: 430px) {
  .status-bar {
    padding: 10px 8px 6px;
  }

  .status-header {
    margin-bottom: 8px;
    padding-bottom: 7px;
    gap: 6px;
  }

  .status-header::after {
    bottom: 18px;
    left: 8px;
    right: 8px;
  }

  .title-block {
    gap: 6px;
    min-width: 0;
  }

  .title-mark {
    width: 24px;
    height: 24px;
    font-size: 9px;
    border-radius: 3px;
    box-shadow: 0 3px 8px rgba(220, 38, 38, 0.3);
    flex-shrink: 0;
  }

  .title-text {
    font-size: 11px;
    letter-spacing: 0.03em;
  }

  .live-indicator {
    font-size: 8px;
    gap: 3px;
  }

  .live-dot {
    width: 4px;
    height: 4px;
  }

  .status-console {
    margin-bottom: 6px;
    border-radius: 2px;
  }

  .console-item {
    padding: 3px 4px 2px;
    gap: 1px;
  }

  .console-label {
    font-size: 6px;
    letter-spacing: 0.08em;
  }

  .console-value {
    font-size: 9px;
    letter-spacing: 0.04em;
  }

  .status-row-1 {
    gap: 4px;
  }

  .phase-tag,
  .pm-tag,
  .crisis-tag {
    padding: 3px 7px;
    font-size: 10px;
    gap: 3px;
    border-left-width: 2px;
  }

  .tag-label {
    font-size: 8px;
  }

  .tag-value {
    font-size: 10px;
  }

  .status-matrix {
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    margin-top: 5px;
  }

  .secondary-tag {
    padding: 3px 6px;
    font-size: 9px;
    gap: 3px;

    .s-label {
      font-size: 8px;
    }

    strong {
      font-size: 9px;
    }
  }
}
</style>
