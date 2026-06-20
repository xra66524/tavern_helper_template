<template>
  <article
    class="char-card"
    :class="[`safety-${safetyLevel}`, { 'is-dead': isDead, 'is-abnormal': isAbnormal }]"
    @click="emit('inspect', 名)"
  >
    <header class="card-head">
      <span class="char-name" :title="名">{{ 名 }}</span>
      <div class="head-actions">
        <button v-if="editing" type="button" class="card-del-btn" title="删除该角色" @click.stop="emit('delete', 名)">
          ✕
        </button>
        <span class="safety-badge" :style="{ background: safetyColor }">{{ char.人身安全 || '—' }}</span>
      </div>
    </header>

    <div class="card-info">
      <span class="info-tag">{{ char.性别 || '—' }} / {{ char.年龄 ?? '—' }}岁</span>
      <span v-if="duty && duty !== '无'" class="info-duty" :title="duty">{{ duty }}</span>
      <span v-if="char.当前位置" class="info-loc" :title="char.当前位置">{{ char.当前位置 }}</span>
      <span v-if="char.当前活动" class="info-activity" :title="char.当前活动">{{ char.当前活动 }}</span>
    </div>

    <span v-if="isAbnormal" class="abnormal-tag" :title="abnormalReason">{{ abnormalReason }}</span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface 履历Item {
  时间: string;
  事件: string;
  来源: string;
}

interface 角色Data {
  姓名?: string;
  性别?: string;
  年龄?: number;
  当前职务?: string;
  当前位置?: string;
  当前活动?: string;
  关系动态?: string;
  人身安全?: string;
  履历?: 履历Item[];
  // 非群友额外字段
  来源?: string;
  对穿越者态度?: string;
}

const props = defineProps<{
  名: string;
  char: 角色Data;
  duty?: string;
  editing?: boolean;
}>();

const emit = defineEmits<{ inspect: [name: string]; delete: [name: string] }>();

const duty = computed(() => props.duty || props.char.当前职务 || '无');

// ── 人身安全色阶（自由字符串 fallback）──
const safetyLevel = computed(() => {
  const v = props.char.人身安全 || '';
  if (v === '已死亡') return 'dead';
  if (v === '危险' || v === '失踪') return 'danger';
  if (v === '需要医护') return 'warn';
  if (v === '受伤') return 'minor';
  if (v === '安全') return 'ok';
  return 'unknown';
});

const safetyColor = computed(() => {
  switch (safetyLevel.value) {
    case 'dead':
      return 'var(--qyc-danger)';
    case 'danger':
      return 'var(--qyc-danger)';
    case 'warn':
      return 'var(--qyc-warn)';
    case 'minor':
      return '#b8a016';
    case 'ok':
      return 'var(--qyc-ok)';
    default:
      return 'var(--qyc-ink-faint)';
  }
});

const isDead = computed(() => props.char.人身安全 === '已死亡');

// ── 异常状态检测：履历末尾条目含叛变/脱离/失踪等关键词 ──
const abnormalKeywords = ['叛变', '脱离', '叛逃', '投敌', '失踪', '被捕', '被俘'];
const abnormalReason = computed(() => {
  const 履历 = props.char.履历 ?? [];
  if (!履历.length) return '';
  const last = 履历[履历.length - 1];
  const text = `${last.事件 || ''}`;
  for (const kw of abnormalKeywords) {
    if (text.includes(kw)) return kw;
  }
  return '';
});
const isAbnormal = computed(() => Boolean(abnormalReason.value));

// 供父组件排序/筛选使用
defineExpose({ safetyLevel, isDead, isAbnormal });
</script>

<style lang="scss" scoped>
.char-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  border: 1px solid var(--qyc-line);
  border-left: 3px solid var(--qyc-ink-faint);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.char-card:hover {
  border-color: var(--qyc-vermilion-faded);
  box-shadow: 0 3px 10px rgba(44, 24, 16, 0.1);
  transform: translateY(-1px);
}

.char-card.safety-ok {
  border-left-color: var(--qyc-ok);
}
.char-card.safety-minor {
  border-left-color: #b8a016;
}
.char-card.safety-warn {
  border-left-color: var(--qyc-warn);
}
.char-card.safety-danger,
.char-card.safety-dead,
.char-card.is-dead {
  border-left-color: var(--qyc-danger);
  opacity: 0.62;
  background: var(--qyc-paper);
}
.char-card.is-abnormal {
  border-left-color: var(--qyc-accent);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card-del-btn {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 4px;
  background: var(--qyc-paper);
  color: var(--qyc-ink-faint);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.card-del-btn:hover {
  border-color: var(--qyc-danger);
  color: var(--qyc-danger);
  background: rgba(178, 34, 34, 0.06);
}

.char-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.safety-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: #fff;
  white-space: nowrap;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: break-word;
  word-break: break-all;
}

.info-tag {
  color: var(--qyc-ink-faint);
}

.info-duty {
  color: var(--qyc-ink);
  font-weight: 600;
}

.info-loc {
  color: var(--qyc-ink-dim);
}

.info-activity {
  color: var(--qyc-ink-faint);
  font-size: 11px;
}

.abnormal-tag {
  align-self: flex-start;
  padding: 1px 6px;
  border: 1px solid var(--qyc-accent);
  border-radius: 999px;
  color: var(--qyc-accent);
  font-size: 11px;
  font-weight: 700;
}
</style>
