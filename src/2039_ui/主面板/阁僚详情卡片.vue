<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="minister-modal" @click.stop>
        <header class="modal-header">
          <div>
            <div class="modal-title">🏛️ {{ position }}</div>
            <div v-if="minister.人身安全状况 === '已流亡'" class="modal-alert">该阁僚已流亡</div>
            <div v-if="minister.人身安全状况 === '已死亡'" class="modal-alert dead">该阁僚已死亡</div>
          </div>
          <button type="button" @click="emit('close')">✕</button>
        </header>

        <section class="detail-section basic">
          <div class="name-line">
            <strong>{{ minister.姓名 || '未任命' }}</strong>
            <span v-if="minister.年龄">· {{ minister.年龄 }}岁</span>
          </div>
          <div class="subtext">原身份：{{ minister.原身份 || '--' }}</div>
          <div class="tag-line">
            <span class="stance" :style="{ borderColor: stanceColor }">{{ minister.政治立场 || '--' }}</span>
            <span>忠诚度</span>
            <ProgressBar :value="minister.忠诚度" tone="positive" />
          </div>
        </section>

        <section class="detail-section">
          <h3>⚙️ 政治能力线</h3>
          <InfoLine label="幕后操控者" :value="minister.幕后操控者" />
          <InfoLine label="操控程度" :value="percentText(minister.操控程度)">
            <ProgressBar :value="minister.操控程度" tone="negative" />
          </InfoLine>
          <InfoLine label="被操控方式" :value="minister.被操控方式" wide />
          <InfoLine label="官僚影响力" :value="percentText(minister.对官僚体系的影响力)">
            <ProgressBar :value="minister.对官僚体系的影响力" tone="positive" />
          </InfoLine>
          <InfoLine label="影响力来源" :value="minister.影响力来源" wide />
          <InfoLine label="争斗状态" :value="minister.与官僚体系的争斗状态" />
          <InfoLine label="官僚应对" :value="minister.官僚体系的应对" wide />
        </section>

        <section class="detail-section">
          <h3>💭 少女视角线</h3>
          <InfoLine label="职位态度" :value="minister.对当前职位的态度" />
          <InfoLine label="心理状态" :value="minister.当前心理状态" wide />
          <InfoLine label="更关心的事" :value="minister.更关心的事" wide />
          <div class="safety-line">
            <span
              >暗杀威胁 <strong :style="{ color: threatColor }">{{ minister.暗杀威胁等级 || '--' }}</strong></span
            >
            <span
              >人身安全 <strong>{{ safetyIcon }} {{ minister.人身安全状况 || '--' }}</strong></span
            >
          </div>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted } from 'vue';
import type { MvuData } from '../../2039_mvu/types';

type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];

const props = defineProps<{
  position: string;
  minister: Minister;
}>();

const emit = defineEmits<{
  close: [];
}>();

const stanceColor = computed(() => {
  const map: Record<string, string> = {
    极右翼: '#ef4444',
    右翼: '#f97316',
    中间偏右: '#eab308',
    中间: '#64748b',
    中间偏左: '#3b82f6',
    左翼: '#22c55e',
    不确定: '#9ca3af',
  };
  return map[props.minister.政治立场] ?? '#9ca3af';
});

const threatColor = computed(() => {
  const map: Record<string, string> = { 无: '#64748b', 低: '#22c55e', 中: '#eab308', 高: '#ef4444', 极高: '#7f1d1d' };
  return map[props.minister.暗杀威胁等级] ?? '#64748b';
});

const safetyIcon = computed(() => {
  const map: Record<string, string> = {
    安全: '🟢',
    有安保: '🔵',
    受到威胁: '🟡',
    已遇袭: '🟠',
    已死亡: '⚫',
    已流亡: '✈️',
  };
  return map[props.minister.人身安全状况] ?? '';
});

const ProgressBar = defineComponent({
  name: 'ProgressBar',
  props: {
    value: { type: Number, default: 0 },
    tone: { type: String, default: 'positive' },
  },
  setup(barProps) {
    return () =>
      h('span', { class: 'progress-wrap' }, [
        h('span', { class: 'progress-track' }, [
          h('span', {
            class: ['progress-fill', barProps.tone],
            style: { width: `${clamp(barProps.value)}%` },
          }),
        ]),
        h('strong', { class: 'progress-num' }, `${Math.round(clamp(barProps.value))}%`),
      ]);
  },
});

const InfoLine = defineComponent({
  name: 'InfoLine',
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
    wide: { type: Boolean, default: false },
  },
  setup(lineProps, { slots }) {
    return () =>
      h('div', { class: ['info-line', { wide: lineProps.wide }] }, [
        h('span', { class: 'info-label' }, lineProps.label),
        slots.default ? slots.default() : h('span', { class: 'info-value' }, lineProps.value || '--'),
        slots.default && lineProps.value ? h('span', { class: 'info-note' }, lineProps.value) : null,
      ]);
  },
});

function clamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function percentText(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '--';
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
  padding: 12px;
  background: rgba(0, 0, 0, 0.54);
  backdrop-filter: blur(4px);
}

.minister-modal {
  width: min(380px, 92vw);
  max-height: 75vh;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98)), #0b1121;
  color: #cbd5e1;
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.55);
}

.modal-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.96);

  button {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(2, 6, 23, 0.5);
    color: #94a3b8;
    cursor: pointer;
  }
}

.modal-title {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 900;
}

.modal-alert {
  margin-top: 4px;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 800;

  &.dead {
    color: #f87171;
  }
}

.detail-section {
  padding: 11px 13px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);

  h3 {
    margin: 0 0 9px;
    color: #e2e8f0;
    font-size: 14px;
    letter-spacing: 0.04em;
  }
}

.name-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: #f8fafc;

  strong {
    font-size: 18px;
  }
}

.subtext {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.tag-line,
.safety-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 9px;
  font-size: 12px;
}

.stance {
  padding: 2px 6px;
  border-left: 3px solid;
  background: rgba(15, 23, 42, 0.7);
  font-weight: 800;
}

:deep(.info-line) {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

:deep(.info-label) {
  color: #64748b;
}

:deep(.info-value) {
  color: #cbd5e1;
  line-height: 1.45;
}

:deep(.info-note) {
  grid-column: 2;
  color: #64748b;
  line-height: 1.45;
}

:deep(.progress-wrap) {
  display: flex;
  align-items: center;
  gap: 7px;
}

:deep(.progress-track) {
  flex: 1;
  min-width: 82px;
  height: 5px;
  overflow: hidden;
  background: rgba(51, 65, 85, 0.75);
}

:deep(.progress-fill) {
  display: block;
  height: 100%;
  transition: width 0.3s ease;
}

:deep(.progress-fill.positive) {
  background: linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e);
}

:deep(.progress-fill.negative) {
  background: linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444);
}

:deep(.progress-num) {
  color: #e2e8f0;
}

@container main-panel (max-width: 430px) {
  .minister-modal {
    width: 95vw;
    max-height: 75vh;
  }
}
</style>
