<template>
  <div class="main-panel">
    <div class="panel-shell">
      <div class="panel-glow"></div>
      <StatusBar @click="toggleStatusBar" />

      <div class="tab-bar" aria-label="主面板标签页">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: currentTab === tab.key }"
          @click="toggleTab(tab.key)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <Transition name="slide-fade">
        <div v-show="expanded" class="tab-content">
          <div v-if="currentTab === 'cabinet'" class="placeholder placeholder-cabinet">
            <div class="placeholder-icon">🏛️</div>
            <div class="placeholder-title">内阁面板</div>
            <div class="placeholder-desc">阁僚双线追踪、官僚操控、少女视角将在这里展开。</div>
          </div>
          <div v-else-if="currentTab === 'ministry'" class="placeholder placeholder-ministry">
            <div class="placeholder-icon">🏢</div>
            <div class="placeholder-title">省厅面板</div>
            <div class="placeholder-desc">各省厅运行状态、主导政策与势力博弈将在这里展示。</div>
          </div>
          <div v-else-if="currentTab === 'livelihood'" class="placeholder placeholder-livelihood">
            <div class="placeholder-icon">🏘️</div>
            <div class="placeholder-title">民生面板</div>
            <div class="placeholder-desc">物价、就业、治安感知与社会情绪等民生指标将在这里呈现。</div>
          </div>
          <div v-else-if="currentTab === 'characters'" class="placeholder placeholder-characters">
            <div class="placeholder-icon">👥</div>
            <div class="placeholder-title">人物面板</div>
            <div class="placeholder-desc">关键人物追踪——政党领袖、在野势力、外国代理人等将在这里显示。</div>
          </div>
          <div v-else-if="currentTab === 'policy'" class="placeholder placeholder-policy">
            <div class="placeholder-icon">📋</div>
            <div class="placeholder-title">政策追踪</div>
            <div class="placeholder-desc">政策生命周期、副作用链条与势力影响将在这里呈现。</div>
          </div>
          <div v-else-if="currentTab === 'international'" class="placeholder placeholder-international">
            <div class="placeholder-icon">🌐</div>
            <div class="placeholder-title">国际面板</div>
            <div class="placeholder-desc">各国对日态度、CSAT/NATO 阵营博弈与外交事件将在这里追踪。</div>
          </div>
          <div v-else-if="currentTab === 'crisis'" class="placeholder placeholder-crisis">
            <div class="placeholder-icon">⚠️</div>
            <div class="placeholder-title">危机仪表盘</div>
            <div class="placeholder-desc">治安、经济、粮食、能源四维危机将在这里可视化。</div>
          </div>
          <div v-else-if="currentTab === 'election'" class="placeholder placeholder-election">
            <div class="placeholder-icon">🗳️</div>
            <div class="placeholder-title">选举看板</div>
            <div class="placeholder-desc">候选人排名、舆论热度与外部干预痕迹将在这里显示。</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import StatusBar from './状态栏.vue';

const tabs = [
  { key: 'cabinet', label: '内阁', icon: '🏛️' },
  { key: 'ministry', label: '省厅', icon: '🏢' },
  { key: 'livelihood', label: '民生', icon: '🏘️' },
  { key: 'characters', label: '人物', icon: '👥' },
  { key: 'policy', label: '政策', icon: '📋' },
  { key: 'international', label: '国际', icon: '🌐' },
  { key: 'crisis', label: '危机', icon: '⚠️' },
  { key: 'election', label: '选举', icon: '🗳️' },
] as const;

const expanded = ref(false);
const currentTab = ref<
  'cabinet' | 'ministry' | 'livelihood' | 'characters' | 'policy' | 'international' | 'crisis' | 'election'
>('cabinet');

const toggleTab = (
  tab: 'cabinet' | 'ministry' | 'livelihood' | 'characters' | 'policy' | 'international' | 'crisis' | 'election',
) => {
  if (currentTab.value === tab) {
    expanded.value = !expanded.value;
  } else {
    currentTab.value = tab;
    expanded.value = true;
  }
};

const toggleStatusBar = () => {
  if (expanded.value) {
    expanded.value = false;
  }
};
</script>

<style lang="scss" scoped>
.main-panel {
  container-type: inline-size;
  container-name: main-panel;
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  color: #e2e8f0;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.panel-shell {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 68px,
      rgba(148, 163, 184, 0.025) 68px,
      rgba(148, 163, 184, 0.025) 69px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 68px,
      rgba(148, 163, 184, 0.025) 68px,
      rgba(148, 163, 184, 0.025) 69px
    ),
    linear-gradient(180deg, #0b1121 0%, #111827 100%);
  box-shadow:
    0 12px 40px rgba(2, 6, 23, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);

  /* 顶部光晕 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), rgba(239, 68, 68, 0.3), transparent);
    pointer-events: none;
  }
}

.panel-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59, 130, 246, 0.08), transparent),
    radial-gradient(ellipse 40% 50% at 100% 80%, rgba(239, 68, 68, 0.04), transparent);
}

.tab-bar {
  position: relative;
  z-index: 1;
  display: flex;
  overflow-x: auto;
  gap: 2px;
  padding: 0 12px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  /* 分隔装饰线 */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent);
  }

  button {
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 64px;
    min-height: 40px;
    padding: 7px 12px 8px;
    border: none;
    border-radius: 4px 4px 0 0;
    background: transparent;
    color: #6b7b95;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition:
      color 0.18s ease,
      background 0.18s ease;
    text-transform: uppercase;

    .tab-icon {
      font-size: 13px;
      opacity: 0.65;
      transition: opacity 0.18s ease;
    }

    .tab-label {
      position: relative;
    }

    /* 底部活动指示线 */
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 20%;
      right: 20%;
      height: 2px;
      border-radius: 2px;
      background: transparent;
      transition: all 0.22s ease;
    }

    &.active {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.04);

      .tab-icon {
        opacity: 1;
      }

      &::after {
        left: 8px;
        right: 8px;
        background: linear-gradient(90deg, #3b82f6, #06b6d4);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.35);
      }
    }

    &:hover {
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.03);

      .tab-icon {
        opacity: 0.85;
      }
    }

    &.active:hover {
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

.tab-content {
  position: relative;
  z-index: 1;
  padding: 0 12px 12px;
}

.placeholder {
  position: relative;
  overflow: hidden;
  min-height: 100px;
  padding: 20px 16px;
  display: grid;
  place-items: center;
  gap: 5px;
  text-align: center;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 4px;

  /* 左上角装饰角标 */
  &::before {
    content: '■';
    position: absolute;
    top: 6px;
    left: 8px;
    color: rgba(148, 163, 184, 0.15);
    font-size: 8px;
    line-height: 1;
    pointer-events: none;
  }

  /* 右下角装饰 */
  &::after {
    content: '◆';
    position: absolute;
    bottom: 6px;
    right: 8px;
    color: rgba(148, 163, 184, 0.08);
    font-size: 6px;
    line-height: 1;
    pointer-events: none;
  }
}

.placeholder-icon {
  font-size: 26px;
  line-height: 1;
  opacity: 0.7;
}

.placeholder-title {
  color: #e2e8f0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.placeholder-desc {
  max-width: 26em;
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.slide-fade-enter-active {
  transition: all 0.18s ease;
}
.slide-fade-leave-active {
  transition: all 0.12s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(2px);
}

/* 桌面宽屏微调 */
@container main-panel (min-width: 431px) {
  .tab-bar {
    gap: 4px;

    button {
      min-width: 80px;
      padding: 8px 16px 10px;
      font-size: 12px;

      .tab-icon {
        font-size: 14px;
      }
    }
  }

  .placeholder {
    min-height: 110px;
    padding: 24px 20px;
  }
}

// 手机端
@container main-panel (max-width: 430px) {
  .tab-bar {
    gap: 6px;
    padding: 6px 8px 10px;

    button {
      min-width: 58px;
      min-height: 40px;
      padding: 6px 10px;
      font-size: 12px;
    }
  }

  .tab-content {
    padding: 0 8px 10px;
  }

  .placeholder {
    min-height: 104px;
    padding: 18px 12px;
  }

  .placeholder-title {
    font-size: 15px;
  }

  .placeholder-desc {
    font-size: 11px;
  }
}
</style>
