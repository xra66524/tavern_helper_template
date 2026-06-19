<template>
  <div class="ministry-panel">
    <div v-if="!hasData" class="skeleton-ministry">
      <div class="skeleton-block w60"></div>
      <div class="skeleton-block h40"></div>
      <div class="skeleton-block h80"></div>
      <div class="skeleton-block h120"></div>
    </div>

    <template v-else>
      <!-- 总览条 -->
      <header class="overview-bar panel-section">
        <div class="overview-title">
          <span class="eyebrow">MINISTRY STATUS</span>
          <div class="title-row">
            <h2>🏢 省厅面板</h2>
            <button type="button" class="settings-btn" title="省厅面板设置" @click="showSettings = true">⚙️</button>
          </div>
        </div>
        <div class="overview-stats">
          <span>共 {{ stats.总数 }} 省厅</span>
          <span class="stat-dot green"></span><span>{{ stats.正常 }}</span> <span class="stat-dot yellow"></span
          ><span>{{ stats.半瘫痪 }}</span> <span class="stat-dot red"></span><span>{{ stats.停摆 }}</span>
        </div>
        <div class="overview-control">
          <span
            >内阁平均掌控 <strong>{{ stats.内阁平均掌控度 }}%</strong></span
          >
          <span
            >事务次官平均掌控 <strong>{{ stats.事务次官平均掌控度 }}%</strong></span
          >
          <span
            >大臣在任 <strong>{{ stats.大臣在任数 }}/{{ stats.总数 }}</strong></span
          >
        </div>
        <div v-if="overviewVerdict" class="overview-verdict" :class="overviewVerdict.class">
          {{ overviewVerdict.text }}
        </div>
      </header>

      <!-- 搜索框 -->
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索省厅名 / 派系 / 焦点 / 局厅名..."
        />
        <button v-if="searchQuery" type="button" class="search-clear" @click="searchQuery = ''">✕</button>
      </div>

      <!-- 筛选栏 + 排序 -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">关键性：</span>
          <button
            v-for="opt in criticalityOptions"
            :key="opt"
            :class="['filter-btn', { active: filterCriticality === opt }]"
            @click="filterCriticality = filterCriticality === opt ? '全部' : opt"
          >
            {{ opt }}
          </button>
        </div>
        <div class="filter-group">
          <span class="filter-label">状态：</span>
          <button
            v-for="opt in statusOptions"
            :key="opt"
            :class="['filter-btn', { active: filterStatus === opt }]"
            @click="filterStatus = filterStatus === opt ? '全部' : opt"
          >
            {{ opt }}
          </button>
        </div>
        <div class="sort-group">
          <span class="filter-label">排序：</span>
          <select v-model="sortBy" class="sort-select">
            <option value="掌控度差">掌控度差</option>
            <option value="关键性">关键性</option>
            <option value="运作状态">运作状态</option>
            <option value="内阁掌控度">内阁掌控度</option>
            <option value="事务次官掌控度">事务次官掌控度</option>
            <option value="对CSAT态度">对CSAT态度</option>
            <option value="对美态度">对美态度</option>
            <option value="派系分组">派系分组</option>
          </select>
        </div>
      </div>

      <!-- 高频省厅列表 -->
      <section class="ministry-list panel-section">
        <div v-if="filteredHighPriority.length === 0 && filteredLowPriority.length === 0" class="empty-box">
          {{ searchQuery ? '未找到匹配的省厅' : '暂无省厅数据' }}
        </div>

        <div class="ministry-entries">
          <div v-for="[mName, mData] in filteredHighPriority" :key="mName" class="ministry-entry">
            <MinistryRow
              :name="mName"
              :ministry="mData"
              :minister="findMinister(mName)"
              :minister-position="findMinisterPosition(mName)"
              :policy-count="activePolicyCount(mName)"
              :bureau-expanded="expandedBureau === mName"
              :collapsed="isCollapsed(mName)"
              :can-collapse="isCollapsible(mName)"
              @open-detail="openDetail"
              @toggle-bureau="toggleBureau"
              @toggle-collapse="toggleCollapse"
              @navigate-to-minister="emit('navigateToMinister', $event)"
              @navigate="emit('navigate', $event)"
            />
            <Transition name="fold">
              <BureauList
                v-if="expandedBureau === mName"
                :ministry-name="mName"
                :active-bureaus="mData.主要下属局厅 ?? []"
              />
            </Transition>
          </div>
        </div>
      </section>

      <!-- 低频省厅折叠区 -->
      <section v-if="filteredLowPriority.length > 0" class="low-priority-section panel-section">
        <button type="button" class="fold-trigger" @click="lowPriorityExpanded = !lowPriorityExpanded">
          <span>低频及以下省厅（{{ filteredLowPriority.length }}个）</span>
          <span>{{ lowPriorityExpanded ? '收起 ▴' : '展开 ▾' }}</span>
        </button>

        <Transition name="fold">
          <div v-if="!lowPriorityExpanded" class="low-priority-tags">
            <span
              v-for="[mName, mData] in filteredLowPriority"
              :key="mName"
              class="low-tag"
              :class="lowTagClass(mData)"
              @click="openDetail(mName)"
            >
              {{ mName }}
              <span v-if="isLowPriorityWarning(mName, mData)" class="low-warning">⚠️</span>
            </span>
          </div>
        </Transition>

        <Transition name="fold">
          <div v-if="lowPriorityExpanded" class="ministry-entries">
            <div v-for="[mName, mData] in filteredLowPriority" :key="mName" class="ministry-entry">
              <MinistryRow
                :name="mName"
                :ministry="mData"
                :minister="findMinister(mName)"
                :minister-position="findMinisterPosition(mName)"
                :policy-count="activePolicyCount(mName)"
                :bureau-expanded="expandedBureau === mName"
                :collapsed="isCollapsed(mName)"
                :can-collapse="isCollapsible(mName)"
                @open-detail="openDetail"
                @toggle-bureau="toggleBureau"
                @toggle-collapse="toggleCollapse"
                @navigate-to-minister="emit('navigateToMinister', $event)"
                @navigate="emit('navigate', $event)"
              />
              <Transition name="fold">
                <BureauList
                  v-if="expandedBureau === mName"
                  :ministry-name="mName"
                  :active-bureaus="mData.主要下属局厅 ?? []"
                />
              </Transition>
            </div>
          </div>
        </Transition>
      </section>

      <!-- 省厅详情弹窗 -->
      <MinistryDetail
        v-if="selectedMinistry"
        :name="selectedMinistry"
        :ministry="ministries[selectedMinistry]!"
        :minister="findMinister(selectedMinistry)"
        :minister-position="findMinisterPosition(selectedMinistry)"
        :related-policies="getRelatedPolicies(selectedMinistry)"
        @close="selectedMinistry = null"
        @navigate="emit('navigate', $event)"
        @navigate-to-minister="emit('navigateToMinister', $event)"
      />

      <!-- 省厅面板设置弹窗 -->
      <MinistrySettings v-if="showSettings" @close="showSettings = false" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 省厅关键性 } from '../../2039_mvu/constants';
import type { MvuData } from '../../2039_mvu/types';
import { useDataStore } from './store';
import { use省厅面板配置 } from './use省厅面板配置';
import BureauList from './下属局厅列表.vue';
import MinistryRow from './省厅行.vue';
import MinistryDetail from './省厅详情弹窗.vue';
import MinistrySettings from './省厅面板设置.vue';

const emit = defineEmits<{
  navigate: [tab: 'policy' | 'characters'];
  navigateToMinister: [position: string];
}>();

type Ministry = MvuData['日本执政']['各省厅'][string];
type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];
type Policy = MvuData['日本执政']['当前政策'][string];

const store = useDataStore();
const data = computed(() => store.data as MvuData);
const { config } = use省厅面板配置();

const hasData = computed(() => Object.keys(data.value).length > 0 && !!data.value.日本执政?.各省厅);

// ── 筛选/搜索/排序状态 ──
const searchQuery = ref('');
const filterCriticality = ref('全部');
const filterStatus = ref('全部');
const sortBy = ref('掌控度差');
const lowPriorityExpanded = ref(false);
const expandedBureau = ref<string | null>(null);
const selectedMinistry = ref<string | null>(null);
const collapsedMinistries = ref<Set<string>>(new Set());
const showSettings = ref(false);

const criticalityOptions = ['全部', '极高', '高', '中', '低频及以下'] as const;
const statusOptions = ['全部', '正常', '半瘫痪', '停摆'] as const;

// ── 省厅数据 ──
const ministries = computed(() => data.value.日本执政?.各省厅 ?? {});
const ministers = computed(() => data.value.日本执政?.本届内阁?.主要阁僚 ?? {});
const policies = computed(() => data.value.日本执政?.当前政策 ?? {});

// ── 总览统计 ──
const stats = computed(() => {
  const values = Object.values(ministries.value);
  return {
    总数: values.length,
    正常: values.filter(v => v.运作状态 === '正常').length,
    半瘫痪: values.filter(v => v.运作状态 === '半瘫痪').length,
    停摆: values.filter(v => v.运作状态 === '停摆').length,
    内阁平均掌控度: Math.round(mean(values.map(v => v.内阁掌控度 ?? 0))),
    事务次官平均掌控度: Math.round(mean(values.map(v => v.事务次官会议掌控度 ?? 0))),
    大臣在任数: values.filter(v => !!v.大臣 && v.大臣 !== '').length,
  };
});

const overviewVerdict = computed(() => {
  const s = stats.value;
  const c = config.value;
  // 按严重程度排序，只显示最严重的一条
  if (s.停摆 >= c.停摆警戒阈值) return { text: '🔴 多省厅停摆，行政体系部分瘫痪', class: 'verdict-critical' };
  if (s.事务次官平均掌控度 > c.事务次官完全主导阈值)
    return { text: '🔴 官僚体系完全主导，内阁形同虚设', class: 'verdict-critical' };
  if (s.事务次官平均掌控度 - s.内阁平均掌控度 > c.掌控差警戒阈值)
    return { text: '⚠️ 官僚体系主导行政', class: 'verdict-warning' };
  if (s.内阁平均掌控度 > c.内阁掌控优势阈值) return { text: '✅ 内阁有效掌控官僚体系', class: 'verdict-ok' };
  if (s.正常 === s.总数 && s.总数 > 0) return { text: '✅ 所有省厅正常运作', class: 'verdict-ok' };
  return null;
});

// ── 筛选 + 搜索 + 排序 ──
const allEntries = computed<[string, Ministry][]>(() => {
  let entries = Object.entries(ministries.value) as [string, Ministry][];

  // 关键性筛选
  if (filterCriticality.value !== '全部') {
    if (filterCriticality.value === '低频及以下') {
      entries = entries.filter(([name]) => ['低频', '极低'].includes(省厅关键性[name] ?? '极低'));
    } else {
      entries = entries.filter(([name]) => 省厅关键性[name] === filterCriticality.value);
    }
  }

  // 运作状态筛选
  if (filterStatus.value !== '全部') {
    entries = entries.filter(([, d]) => d.运作状态 === filterStatus.value);
  }

  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    entries = entries.filter(([name, d]) => {
      const fields = [name, d.倾向派系 ?? '', d.当前焦点 ?? '', ...(d.主要下属局厅 ?? [])];
      return fields.some(f => f.toLowerCase().includes(q));
    });
  }

  // 排序
  entries.sort((a, b) => {
    const [nameA, dA] = a;
    const [nameB, dB] = b;
    switch (sortBy.value) {
      case '掌控度差': {
        const diffA = (dA.事务次官会议掌控度 ?? 0) - (dA.内阁掌控度 ?? 0);
        const diffB = (dB.事务次官会议掌控度 ?? 0) - (dB.内阁掌控度 ?? 0);
        return diffB - diffA;
      }
      case '关键性': {
        const wA = config.value.关键性排序权重[省厅关键性[nameA] ?? '极低'] ?? 1;
        const wB = config.value.关键性排序权重[省厅关键性[nameB] ?? '极低'] ?? 1;
        return wB - wA;
      }
      case '运作状态': {
        const order: Record<string, number> = { 停摆: 0, 半瘫痪: 1, 正常: 2 };
        return (order[dA.运作状态 ?? ''] ?? 3) - (order[dB.运作状态 ?? ''] ?? 3);
      }
      case '内阁掌控度':
        return (dA.内阁掌控度 ?? 0) - (dB.内阁掌控度 ?? 0);
      case '事务次官掌控度':
        return (dB.事务次官会议掌控度 ?? 0) - (dA.事务次官会议掌控度 ?? 0);
      case '对CSAT态度':
        return Math.abs(dB.对CSAT态度 ?? 0) - Math.abs(dA.对CSAT态度 ?? 0);
      case '对美态度':
        return Math.abs(dB.对美态度 ?? 0) - Math.abs(dA.对美态度 ?? 0);
      case '派系分组': {
        const fA = dA.倾向派系 ?? '';
        const fB = dB.倾向派系 ?? '';
        if (fA !== fB) return fA.localeCompare(fB);
        const diffA = (dA.事务次官会议掌控度 ?? 0) - (dA.内阁掌控度 ?? 0);
        const diffB = (dB.事务次官会议掌控度 ?? 0) - (dB.内阁掌控度 ?? 0);
        return diffB - diffA;
      }
      default:
        return 0;
    }
  });

  return entries;
});

// ── 高频/低频分离 ──
const filteredHighPriority = computed(() =>
  allEntries.value.filter(([name]) => ['极高', '高', '中'].includes(省厅关键性[name] ?? '中')),
);

const filteredLowPriority = computed(() =>
  allEntries.value.filter(([name]) => ['低频', '极低'].includes(省厅关键性[name] ?? '极低')),
);

// ── 主管阁僚匹配（优先使用省厅.大臣字段，回退到关键词匹配） ──
function findMinister(省厅名: string): Minister | null {
  const 阁僚们 = ministers.value;
  const 省厅 = ministries.value[省厅名];

  // 优先：直接使用省厅.大臣姓名查找阁僚
  if (省厅?.大臣) {
    for (const 阁僚 of Object.values(阁僚们)) {
      if (阁僚.姓名 === 省厅.大臣) return 阁僚;
    }
  }

  // 回退：关键词匹配（兼容旧数据无大臣字段的情况）
  const keyword = config.value.省厅阁僚关键词映射[省厅名] ?? 省厅名.replace(/[省厅委员会]/g, '');
  for (const [职位, 阁僚] of Object.entries(阁僚们)) {
    if (职位.includes(keyword)) return 阁僚;
  }
  return null;
}

function findMinisterPosition(省厅名: string): string | null {
  const 阁僚们 = ministers.value;
  const 省厅 = ministries.value[省厅名];

  // 优先：通过省厅.大臣姓名反查职位
  if (省厅?.大臣) {
    for (const [职位, 阁僚] of Object.entries(阁僚们)) {
      if (阁僚.姓名 === 省厅.大臣) return 职位;
    }
  }

  // 回退：关键词匹配
  const keyword = config.value.省厅阁僚关键词映射[省厅名] ?? 省厅名.replace(/[省厅委员会]/g, '');
  for (const [职位] of Object.entries(阁僚们)) {
    if (职位.includes(keyword)) return 职位;
  }
  return null;
}

// ── 活跃政策计数 ──
function activePolicyCount(省厅名: string): number {
  return Object.values(policies.value).filter(p => p.主管省厅 === 省厅名).length;
}

// ── 关联政策 ──
function getRelatedPolicies(省厅名: string): [string, Policy][] {
  return Object.entries(policies.value).filter(([, p]) => p.主管省厅 === 省厅名) as [string, Policy][];
}

// ── 折叠逻辑 ──
function isCollapsible(name: string): boolean {
  const crit = 省厅关键性[name] ?? '中';
  return config.value.默认折叠的关键性等级.includes(crit);
}

function isCollapsed(name: string): boolean {
  return collapsedMinistries.value.has(name);
}

function toggleCollapse(name: string) {
  if (collapsedMinistries.value.has(name)) {
    collapsedMinistries.value.delete(name);
  } else {
    collapsedMinistries.value.add(name);
  }
}

// ── 下属局厅展开 ──
function toggleBureau(name: string) {
  expandedBureau.value = expandedBureau.value === name ? null : name;
}

// ── 详情弹窗 ──
function openDetail(name: string) {
  expandedBureau.value = null; // 收起局厅展开
  selectedMinistry.value = name;
}

// ── 低频省厅标签样式 ──
function lowTagClass(mData: Ministry) {
  if (mData.运作状态 === '停摆') return 'tag-red';
  if (mData.运作状态 === '半瘫痪') return 'tag-yellow';
  return '';
}

function isLowPriorityWarning(_name: string, mData: Ministry): boolean {
  const diff = (mData.事务次官会议掌控度 ?? 0) - (mData.内阁掌控度 ?? 0);
  return diff > config.value.低频警戒掌控差阈值;
}

// ── 工具函数 ──
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── 打开详情弹窗时收起局厅 ──
watch(selectedMinistry, val => {
  if (val) expandedBureau.value = null;
});
</script>

<style scoped lang="scss">
.ministry-panel {
  display: grid;
  gap: 10px;
}

// ── 总览条 ──
.overview-bar {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.48);
}

.overview-title {
  margin-bottom: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 2px 0 0;
    color: #f8fafc;
    font-size: 17px;
    letter-spacing: 0.08em;
  }
}

.settings-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.4);
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.4);
    color: #e2e8f0;
    background: rgba(59, 130, 246, 0.1);
  }
}

.eyebrow {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.overview-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.stat-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;

  &.green {
    background: #22c55e;
  }
  &.yellow {
    background: #eab308;
  }
  &.red {
    background: #ef4444;
  }
}

.overview-control {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #94a3b8;

  strong {
    color: #e2e8f0;
  }
}

.overview-verdict {
  margin-top: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(2, 6, 23, 0.4);
  font-size: 12px;
  font-weight: 800;

  &.verdict-critical {
    color: #ef4444;
    border-left: 3px solid #ef4444;
  }

  &.verdict-warning {
    color: #eab308;
    border-left: 3px solid #eab308;
  }

  &.verdict-ok {
    color: #22c55e;
    border-left: 3px solid #22c55e;
  }
}

// ── 搜索框 ──
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.52);
}

.search-icon {
  font-size: 13px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;

  &::placeholder {
    color: #64748b;
  }
}

.search-clear {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: #94a3b8;
  }
}

// ── 筛选栏 ──
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-label {
  color: #64748b;
  font-weight: 800;
}

.filter-btn {
  padding: 2px 8px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.3);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.3);
    color: #e2e8f0;
  }

  &.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.12);
    color: #bfdbfe;
  }
}

.sort-group {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.sort-select {
  padding: 2px 6px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.5);
  color: #e2e8f0;
  font-size: 11px;
  outline: none;
  cursor: pointer;
}

// ── 省厅列表 ──
.panel-section {
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.52);
}

.ministry-list {
  padding: 10px;
}

.ministry-entries {
  display: grid;
  gap: 6px;
}

.ministry-entry {
  border-radius: 4px;
}

.empty-box {
  padding: 14px 10px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

// ── 低频省厅折叠区 ──
.low-priority-section {
  padding: 0;
}

.fold-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  span:last-child {
    color: #60a5fa;
    font-size: 12px;
  }
}

.low-priority-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 10px;
}

.low-tag {
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.4);
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #e2e8f0;
  }

  &.tag-yellow {
    color: #eab308;
  }

  &.tag-red {
    color: #ef4444;
  }
}

.low-warning {
  font-size: 10px;
}

// ── 骨架屏 ──
.skeleton-ministry {
  display: grid;
  gap: 10px;
}

.skeleton-block {
  height: 32px;
  border-radius: 4px;
  background: linear-gradient(90deg, #1e293b, #334155, #1e293b);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.w60 {
  width: 60%;
}
.h40 {
  height: 40px;
}
.h80 {
  height: 80px;
}
.h120 {
  height: 120px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
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
  max-height: 800px;
  opacity: 1;
}

// ── 移动端 ──
@container main-panel (max-width: 430px) {
  .filter-bar {
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .filter-btn,
  .sort-select {
    min-height: 36px;
  }

  .overview-control {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
