<template>
  <div class="status-bar" @click="emit('click')">
    <div class="status-header">
      <div class="title-block">
        <span class="title-mark">2039</span>
        <span class="title-text">政局监测面板</span>
      </div>
      <span class="live-indicator">
        <span class="live-dot"></span>
        待同步
      </span>
    </div>
    <div class="status-row-1">
      <span class="phase-tag placeholder">
        <span class="tag-icon">●</span>
        政治阶段
      </span>
      <span class="pm-tag placeholder">
        <span class="tag-icon">♛</span>
        首相：--
      </span>
      <span class="crisis-tag placeholder">
        <span class="tag-icon">⚠</span>
        危机：--
      </span>
    </div>
    <div class="status-row-2">
      <span class="secondary-tag">稳定度 <strong>--</strong></span>
      <span class="secondary-tag">外压 <strong>--</strong></span>
      <span class="secondary-tag">合法性 <strong>--</strong></span>
      <span class="secondary-tag">控制力 <strong>--</strong></span>
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
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #64748b;
  animation: breathe 1.8s ease-in-out infinite;
}

.status-row-1 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.status-row-2 {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
}

.phase-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: rgba(239, 68, 68, 0.12);
  border-left: 3px solid #ef4444;
  color: #fca5a5;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.pm-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid #6366f1;
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.crisis-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: rgba(234, 179, 8, 0.1);
  border-left: 3px solid #eab308;
  color: #fde68a;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.tag-icon {
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
}

.secondary-tag {
  padding: 3px 7px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.08);
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;

  strong {
    color: #94a3b8;
    font-weight: 700;
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

  .status-row-1 {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .status-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 4px;
    margin-top: 6px;
  }

  .phase-tag,
  .pm-tag,
  .crisis-tag {
    padding: 3px 6px;
    font-size: 10px;
    gap: 3px;
    border-left-width: 2px;
  }

  .tag-icon {
    font-size: 8px;
  }

  .secondary-tag {
    padding: 3px 6px;
    font-size: 9px;
    width: auto;

    strong {
      font-size: 9px;
    }
  }
}
</style>
