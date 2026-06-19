<template>
  <div class="ministry-row" :class="rowClass" :style="rowStyle">
    <!-- 第一行：标识 + 名称 + 状态 -->
    <div class="row-top">
      <span class="criticality-icon" :style="{ color: criticalityColor }">
        <i :class="criticalityIconClass" />
      </span>
      <span class="criticality-label" :style="{ color: criticalityColor }">{{ criticality }}</span>
      <span class="ministry-name">{{ name }}</span>
      <span class="status-chip" :style="statusChipStyle">
        <span class="status-dot" :style="{ background: statusColor }"></span>
        {{ ministry.运作状态 || '--' }}
      </span>
    </div>

    <!-- 第二行：掌控度对抗条（内阁#蓝 vs 事务次官#红） -->
    <div class="control-bar-row">
      <span class="control-label cabinet-label">内阁</span>
      <div class="control-dual-track">
        <!-- 内阁侧：蓝色从左延伸，末端有截止标记 -->
        <span class="control-fill-l" :style="{ width: `${cabinetControl}%` }">
          <span class="control-stopper-l"></span>
          <span class="control-fill-label" v-if="cabinetControl >= 15">{{ cabinetControl }}%</span>
        </span>
        <!-- 事务次官侧：红色从右延伸，末端有截止标记 -->
        <span class="control-fill-r" :style="{ width: `${bureauControl}%` }">
          <span class="control-stopper-r"></span>
          <span class="control-fill-label" v-if="bureauControl >= 15">{{ bureauControl }}%</span>
        </span>
        <!-- 对抗中线 -->
        <span class="control-divider"></span>
      </div>
      <span class="control-label bureau-label">事务次官</span>
    </div>

    <!-- 折叠区域（可展开的详细信息） -->
    <Transition name="fold">
      <div v-if="!collapsed" class="row-details">
        <!-- 第三行：派系标签 + 态度色块 -->
        <div class="faction-attitude-row">
          <span class="faction-label" :style="{ borderColor: factionColor, color: factionColor }">
            {{ ministry.倾向派系 || '未明确' }}
          </span>
          <span class="attitude-block">
            <span class="attitude-label">CSAT</span>
            <span class="attitude-swatch" :style="{ background: csatColor }"></span>
            <span class="attitude-value" :style="{ color: csatColor }">{{ signed(ministry.对CSAT态度) }}</span>
          </span>
          <span class="attitude-block">
            <span class="attitude-label">美</span>
            <span class="attitude-swatch" :style="{ background: usaColor }"></span>
            <span class="attitude-value" :style="{ color: usaColor }">{{ signed(ministry.对美态度) }}</span>
          </span>
        </div>

        <!-- 第四行：当前焦点 -->
        <div class="focus-row">
          <span class="focus-label">焦点：</span>
          <span v-if="!ministry.当前焦点" class="focus-empty">暂无焦点事项</span>
          <template v-else>
            <span class="focus-text" :class="{ truncated: focusTruncated && !focusExpanded }">
              {{ ministry.当前焦点 }}
            </span>
            <button v-if="focusTruncated" type="button" class="expand-btn" @click.stop="focusExpanded = !focusExpanded">
              {{ focusExpanded ? '收起 ▴' : '▸ 展开' }}
            </button>
          </template>
        </div>

        <!-- 第五行：主管阁僚 + 活跃政策 -->
        <div class="meta-row">
          <span class="meta-item">
            主管阁僚：
            <template v-if="minister">
              <span
                class="minister-link"
                :style="{ borderColor: ministerStanceColor }"
                @click.stop="emit('navigateToMinister', ministerPosition!)"
              >
                {{ minister.姓名 }}
              </span>
              ▸
            </template>
            <span v-else class="meta-empty">空位</span>
          </span>
          <span class="meta-item">
            活跃政策：
            <span v-if="policyCount > 0" class="policy-link" @click.stop="emit('navigate', 'policy')">
              {{ policyCount }}项
            </span>
            <span v-else class="meta-empty">0</span>
          </span>
        </div>

        <!-- 第六行：副大臣 + 事务次官 -->
        <div class="personnel-row">
          <span class="meta-item">
            副大臣：
            <template v-if="ministry.副大臣?.姓名">
              <span class="personnel-name" :style="{ color: viceMinisterAttitudeColor }">
                {{ ministry.副大臣.姓名 }}
              </span>
              <span class="personnel-sub" v-if="ministry.副大臣.对阁僚态度"> ({{ ministry.副大臣.对阁僚态度 }}) </span>
            </template>
            <span v-else class="meta-empty">空位</span>
          </span>
          <span class="meta-item">
            {{ bureaucratTitle }}：
            <template v-if="ministry.事务次官?.姓名">
              <span class="personnel-name" :style="{ color: bureaucratAttitudeColor }">
                {{ ministry.事务次官.姓名 }}
              </span>
              <span class="personnel-sub" v-if="ministry.事务次官.对阁僚态度">
                ({{ ministry.事务次官.对阁僚态度 }})
              </span>
            </template>
            <span v-else class="meta-empty">空位</span>
          </span>
        </div>

        <!-- 第六行：下属局厅 -->
        <div class="bureau-row">
          <span class="bureau-summary"> 下属 {{ activeBureauCount }} 个局厅 </span>
          <button type="button" class="expand-btn" @click.stop="emit('toggleBureau', name)">
            {{ bureauExpanded ? '▾ 收起' : '▸ 展开' }}
          </button>
        </div>

        <!-- 第七行：详情入口 -->
        <div class="detail-entry">
          <button type="button" class="detail-btn" @click.stop="emit('openDetail', name)">▸ 查看省厅详情</button>
        </div>

        <!-- 预警标签 -->
        <div v-if="warnings.length > 0" class="warning-tags">
          <span v-for="w in warnings" :key="w.type" class="warning-tag" :class="w.class" :style="w.style">
            {{ w.text }}
          </span>
        </div>
      </div>
    </Transition>

    <!-- 折叠/展开按钮（折叠模式下显示） -->
    <button v-if="canCollapse" type="button" class="collapse-toggle" @click.stop="emit('toggleCollapse', name)">
      {{ collapsed ? '▾ 展开完整信息' : '▴ 收起' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { get事务方一把手称呼, 省厅关键性 } from '../../2039_mvu/constants';
import type { MvuData } from '../../2039_mvu/types';
import { use省厅面板配置 } from './use省厅面板配置';

type Ministry = MvuData['日本执政']['各省厅'][string];
type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];

const props = defineProps<{
  name: string;
  ministry: Ministry;
  minister: Minister | null;
  ministerPosition: string | null;
  policyCount: number;
  bureauExpanded: boolean;
  collapsed: boolean;
  canCollapse: boolean;
}>();

const emit = defineEmits<{
  openDetail: [name: string];
  toggleBureau: [name: string];
  toggleCollapse: [name: string];
  navigateToMinister: [position: string];
  navigate: [tab: 'policy' | 'characters'];
}>();

const { config } = use省厅面板配置();

const focusExpanded = ref(false);

// ── 关键性 ──
const criticality = computed(() => 省厅关键性[props.name] ?? '中');
const bureaucratTitle = computed(() => get事务方一把手称呼(props.name));

const criticalityColor = computed(() => {
  const map: Record<string, string> = {
    极高: '#ef4444',
    高: '#f97316',
    中: '#eab308',
    低频: '#64748b',
    极低: '#475569',
  };
  return map[criticality.value] ?? '#64748b';
});

const criticalityIconClass = computed(() => {
  const map: Record<string, string> = {
    极高: 'fa-solid fa-skull',
    高: 'fa-solid fa-shield-halved',
    中: 'fa-solid fa-shield-halved',
    低频: 'fa-solid fa-shield',
    极低: 'fa-solid fa-shield',
  };
  return map[criticality.value] ?? 'fa-solid fa-shield';
});

// ── 运作状态 ──
const statusColor = computed(() => {
  const map: Record<string, string> = { 正常: '#22c55e', 半瘫痪: '#eab308', 停摆: '#ef4444' };
  return map[props.ministry.运作状态 ?? ''] ?? '#64748b';
});

const statusChipStyle = computed(() => ({
  borderColor: statusColor.value,
  color: statusColor.value,
}));

// ── 掌控度 ──
const cabinetControl = computed(() => clamp(props.ministry.内阁掌控度));
const bureauControl = computed(() => clamp(props.ministry.事务次官会议掌控度));

// ── 派系 ──
const factionColor = computed(() => config.value.派系颜色映射[props.ministry.倾向派系] ?? '#64748b');

// ── 态度色块 ──
const csatColor = computed(() => getAttitudeColor(props.ministry.对CSAT态度));
const usaColor = computed(() => getAttitudeColor(props.ministry.对美态度));

// ── 阁僚 ──
const ministerStanceColor = computed(() => {
  if (!props.minister) return '#64748b';
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

// ── 副大臣 / 事务次官态度色 ──
const viceMinisterAttitudeColor = computed(() => {
  const att = props.ministry.副大臣?.对阁僚态度;
  const map: Record<string, string> = {
    忠实辅佐: '#22c55e',
    表面配合暗中掣肘: '#eab308',
    完全听命于事务次官: '#ef4444',
    独立行事: '#3b82f6',
    消极怠工: '#9ca3af',
  };
  return map[att ?? ''] ?? '#64748b';
});

const bureaucratAttitudeColor = computed(() => {
  const att = props.ministry.事务次官?.对阁僚态度;
  const map: Record<string, string> = {
    表面服从: '#22c55e',
    消极抵抗: '#eab308',
    架空阁僚: '#ef4444',
    主动配合: '#22c55e',
    暗中操控: '#ef4444',
    公开对抗: '#f97316',
  };
  return map[att ?? ''] ?? '#64748b';
});

// ── 焦点 ──
const focusTruncated = computed(() => (props.ministry.当前焦点?.length ?? 0) > 60);

// ── 下属局厅 ──
const activeBureauCount = computed(() => props.ministry.主要下属局厅?.length ?? 0);

// ── 行样式 ──
const rowClass = computed(() => ({
  'status-normal': props.ministry.运作状态 === '正常',
  'status-paralyzed': props.ministry.运作状态 === '半瘫痪',
  'status-halted': props.ministry.运作状态 === '停摆',
}));

const rowStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.ministry.运作状态 === '半瘫痪') {
    style.borderLeftColor = '#eab308';
    style.borderLeftWidth = '2px';
  } else if (props.ministry.运作状态 === '停摆') {
    style.borderLeftColor = '#ef4444';
    style.borderLeftWidth = '2px';
  } else {
    style.borderLeftColor = '#22c55e';
    style.borderLeftWidth = '2px';
  }
  return style;
});

// ── 预警 ──
const warnings = computed(() => {
  const result: Array<{ type: string; text: string; class: string; style: Record<string, string> }> = [];
  const c = config.value;
  const crit = criticality.value;
  const cc = cabinetControl.value;
  const bc = bureauControl.value;

  // 命脉失守
  if (
    c.启用预警.命脉失守 &&
    crit === '极高' &&
    (props.ministry.运作状态 === '停摆' || props.ministry.运作状态 === '半瘫痪')
  ) {
    result.push({ type: '命脉失守', text: '⚠️ 失守', class: 'warning-critical', style: { color: '#ef4444' } });
  }

  // 完全架空
  if (c.启用预警.完全架空 && crit === '极高' && cc < c.架空警戒阈值) {
    result.push({ type: '完全架空', text: '⚠️ 架空', class: 'warning-orange', style: { color: '#f97316' } });
  }

  // 官僚锁死
  if (c.启用预警.官僚锁死 && bc > c.官僚锁死阈值 && cc < 10) {
    result.push({ type: '官僚锁死', text: '🔒 完全架空', class: 'warning-red', style: { color: '#ef4444' } });
  }

  // CSAT渗透
  if (c.启用预警.CSAT渗透 && props.ministry.对CSAT态度 > c.CSAT渗透阈值 && (crit === '极高' || crit === '高')) {
    result.push({ type: 'CSAT渗透', text: '🔴 CSAT深度渗透', class: 'warning-pulse-red', style: { color: '#ef4444' } });
  }

  // 美国渗透
  if (c.启用预警.美国渗透 && props.ministry.对美态度 > c.美国渗透阈值 && (crit === '极高' || crit === '高')) {
    result.push({
      type: '美国渗透',
      text: '🔵 美国深度渗透',
      class: 'warning-pulse-blue',
      style: { color: '#3b82f6' },
    });
  }

  return result;
});

// ── 工具函数 ──
function clamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function signed(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
}

function getAttitudeColor(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '#64748b';
  const seg = config.value.态度色段.find(s => value >= s.min && value <= s.max);
  return seg?.color ?? '#64748b';
}
</script>

<style scoped lang="scss">
.ministry-row {
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-left: 2px solid #22c55e;
  background: rgba(2, 6, 23, 0.25);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.28);
    background: rgba(15, 23, 42, 0.55);
  }

  &.status-paralyzed {
    background: rgba(234, 179, 8, 0.04);
  }

  &.status-halted {
    background: rgba(239, 68, 68, 0.05);
  }
}

.row-top {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}

.criticality-icon {
  font-size: 12px;
}

.criticality-label {
  font-size: 11px;
  font-weight: 800;
}

.ministry-name {
  flex: 1;
  min-width: 0;
  color: #f8fafc;
  font-size: 14px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-left: 2px solid;
  background: rgba(2, 6, 23, 0.45);
  font-size: 11px;
  font-weight: 800;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

// ── 掌控度对抗条（单条双端填充） ──
.control-bar-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 52px;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}

.control-label {
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.cabinet-label {
  color: #94a3b8;
  text-align: right;
}

.bureau-label {
  color: #94a3b8;
  text-align: left;
}

// 单条双端轨道
.control-dual-track {
  position: relative;
  height: 18px;
  overflow: hidden;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 2px;
}

.control-fill-l {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 3px;
  background: #3b82f6;
  transition: width 0.35s ease;
  z-index: 1;
}

// 蓝色截止标记（内阁侧右端）
.control-stopper-l {
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  background: #60a5fa;
  box-shadow: 0 0 4px rgba(59, 130, 246, 0.6);
  border-radius: 0 1px 1px 0;
}

.control-fill-r {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 3px;
  background: #ef4444;
  transition: width 0.35s ease;
  z-index: 1;
}

// 红色截止标记（事务次官侧左端）
.control-stopper-r {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #f87171;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
  border-radius: 1px 0 0 1px;
}

.control-fill-label {
  font-size: 9px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}

// 对抗中线
.control-divider {
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  z-index: 0;
  pointer-events: none;
}

.control-label {
  white-space: nowrap;
  font-weight: 800;
}

.cabinet-label {
  color: #94a3b8;
}

.bureau-label {
  color: #94a3b8;
}

// ── 折叠区域 ──
.row-details {
  overflow: hidden;
}

// ── 派系 + 态度 ──
.faction-attitude-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
}

.faction-label {
  padding: 2px 6px;
  border-left: 3px solid;
  background: rgba(15, 23, 42, 0.7);
  font-weight: 800;
  cursor: pointer;
}

.attitude-block {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
}

.attitude-label {
  color: #64748b;
  font-weight: 800;
}

.attitude-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.attitude-value {
  font-weight: 800;
}

// ── 焦点 ──
.focus-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.45;
}

.focus-label {
  flex-shrink: 0;
  color: #64748b;
  font-weight: 800;
}

.focus-text {
  color: #cbd5e1;

  &.truncated {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.focus-empty {
  color: #64748b;
  font-style: italic;
}

// ── 阁僚 + 政策 ──
.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.minister-link {
  padding-left: 5px;
  border-left: 2px solid;
  color: #e2e8f0;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    color: #60a5fa;
  }
}

.policy-link {
  color: #60a5fa;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.meta-empty {
  color: #64748b;
}

// ── 副大臣 + 事务次官 ──
.personnel-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
}

.personnel-name {
  font-weight: 800;
}

.personnel-sub {
  color: #64748b;
  font-size: 11px;
}

// ── 下属局厅 ──
.bureau-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  color: #94a3b8;
}

.bureau-summary {
  font-weight: 800;
}

// ── 详情入口 ──
.detail-entry {
  padding: 4px 0;
}

.detail-btn {
  border: none;
  background: transparent;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    color: #93c5fd;
  }
}

// ── 预警标签 ──
.warning-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 5px;
}

.warning-tag {
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.5);
  font-size: 11px;
  font-weight: 800;
}

.warning-pulse-red {
  animation: pulse-red 1.5s ease-in-out infinite;
}

.warning-pulse-blue {
  animation: pulse-blue 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes pulse-blue {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

// ── 折叠/展开按钮 ──
.expand-btn,
.collapse-toggle {
  border: none;
  background: transparent;
  color: #60a5fa;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    color: #93c5fd;
  }
}

.collapse-toggle {
  display: block;
  width: 100%;
  padding: 4px 0 0;
  text-align: center;
}

// ── 折叠过渡 ──
.fold-enter-active,
.fold-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.25s ease;
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  max-height: 0;
  opacity: 0;
}

.fold-enter-to,
.fold-leave-from {
  max-height: 500px;
  opacity: 1;
}

// ── 移动端 ──
@container main-panel (max-width: 430px) {
  .ministry-name {
    font-size: 12px;
  }

  .control-bar-row {
    font-size: 10px;
  }

  .faction-attitude-row {
    font-size: 11px;
  }

  .focus-row {
    font-size: 11px;
  }

  .attitude-swatch {
    width: 8px;
    height: 8px;
  }
}
</style>
