<template>
  <div class="char-grid-panel">
    <header class="grid-header">
      <div>
        <p class="grid-kicker">CHARACTER ARCHIVE</p>
        <h3>👥 角色群像</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <!-- 子 Tab：群友 / 非群友 -->
    <nav class="sub-tabs">
      <button type="button" class="sub-tab" :class="{ active: subTab === '群友' }" @click="subTab = '群友'">
        群友 <span class="count">{{ 群友列表.length }}</span>
      </button>
      <button type="button" class="sub-tab" :class="{ active: subTab === '非群友' }" @click="subTab = '非群友'">
        非群友 <span class="count">{{ 非群友列表.length }}</span>
      </button>
    </nav>

    <!-- 搜索 / 筛选 / 排序 -->
    <div class="toolbar">
      <input v-model="searchText" type="text" class="form-input search-input" placeholder="🔍 搜索姓名/职务/履历…" />

      <label class="filter-item">
        <span class="filter-label">所属系统</span>
        <select v-model="filterSystem" class="form-select">
          <option value="">全部</option>
          <option v-for="sys in systemOptions" :key="sys" :value="sys">{{ sys }}</option>
        </select>
      </label>

      <label class="filter-item">
        <span class="filter-label">人身安全</span>
        <select v-model="filterSafety" class="form-select">
          <option value="">全部</option>
          <option v-for="opt in 人身安全选项" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>

      <label class="filter-item">
        <span class="filter-label">排序</span>
        <select v-model="sortBy" class="form-select">
          <option value="姓名">姓名</option>
          <option value="安全">安全状态</option>
          <option value="职务">职务</option>
        </select>
      </label>
    </div>

    <div v-if="!filtered.length" class="empty-hint">无匹配角色</div>

    <!-- 网格 -->
    <div v-else class="grid">
      <CharacterCard
        v-for="entry in pagedList"
        :key="entry[0]"
        :名="entry[0]"
        :char="entry[1]"
        :duty="dutyOf(entry[0])"
        :editing="editing"
        @inspect="onInspect"
        @delete="onDelete"
      />
    </div>

    <!-- 分页 -->
    <footer v-if="filtered.length > pageSize" class="pager">
      <button type="button" class="pager-btn" :disabled="page === 1" @click="page--">‹ 上一页</button>
      <span class="pager-info">{{ page }} / {{ totalPages }} 页 · 共 {{ filtered.length }} 人</span>
      <button type="button" class="pager-btn" :disabled="page === totalPages" @click="page++">下一页 ›</button>
    </footer>

    <!-- 编辑模式：增删角色 -->
    <div v-if="editing" class="edit-zone">
      <button type="button" class="add-btn" @click="onAdd">＋ 添加{{ subTab }}</button>
      <p class="edit-hint">点击任意角色卡片打开编辑弹窗；点击卡片右上角 ✕ 可直接删除角色。</p>
    </div>

    <!-- 角色编辑弹窗 -->
    <CharacterEditModal
      v-if="editingName"
      :名="editingName"
      :char="editingChar"
      :is-群友="subTab === '群友'"
      @close="editingName = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { 人身安全参考列表 } from '../../../../src/群友群穿/constants';
import { useDataStore } from '../store';
import CharacterCard from './CharacterCard.vue';
import CharacterEditModal from './CharacterEditModal.vue';

const store = useDataStore() as any;
const editing = ref(false);
const editingName = ref('');
const editingChar = computed<any>(() => 当前列表.value.find(([n]) => n === editingName.value)?.[1] ?? null);

const subTab = useLocalStorage<'群友' | '非群友'>('群友群穿:char_grid:sub_tab', '群友');

// ── 数据源 ──
const 群友角色表 = computed<Record<string, any>>(() => store.data?.群友角色 ?? {});
const 非群友角色表 = computed<Record<string, any>>(() => store.data?.非群友角色 ?? {});

const 群友列表 = computed(() => Object.entries(群友角色表.value));
const 非群友列表 = computed(() => Object.entries(非群友角色表.value));

const 当前列表 = computed(() => (subTab.value === '群友' ? 群友列表.value : 非群友列表.value));

// ── 机构表（用于推导所属系统与职务）──
const 机构表 = computed<Record<string, any>>(() => store.data?.组织结构?.机构 ?? {});

// 推导某角色在机构表中的职务（一把手/二把手/副职/成员）
function dutyOf(角色名: string): string {
  for (const [机构名, 机构] of Object.entries(机构表.value)) {
    if (机构.一把手 === 角色名) return `${机构名}·一把手`;
    if (机构.二把手 === 角色名) return `${机构名}·二把手`;
    if (Array.isArray(机构.副职) && 机构.副职.includes(角色名)) return `${机构名}·副职`;
    if (Array.isArray(机构.成员) && 机构.成员.includes(角色名)) return `${机构名}·成员`;
  }
  // 回退到角色自身的 当前职务 字段
  const c = 当前列表.value.find(([n]) => n === 角色名)?.[1];
  return c?.当前职务 || '无';
}

// 推导顶层机构（沿 上级机构 链上溯）
function 推导顶层机构(角色名: string): string {
  for (const [机构名, 机构] of Object.entries(机构表.value)) {
    const 副职 = Array.isArray(机构.副职) ? 机构.副职 : [];
    const 成员 = Array.isArray(机构.成员) ? 机构.成员 : [];
    if (机构.一把手 === 角色名 || 机构.二把手 === 角色名 || 副职.includes(角色名) || 成员.includes(角色名)) {
      let 当前 = 机构名;
      while (机构表.value[当前]?.上级机构) 当前 = 机构表.value[当前].上级机构;
      return 当前;
    }
  }
  return '无所属';
}

// ── 搜索 / 筛选 / 排序 ──
const searchText = ref('');
const filterSystem = ref('');
const filterSafety = ref('');
const sortBy = ref<'姓名' | '安全' | '职务'>('姓名');

const 人身安全选项 = [...人身安全参考列表];

// 所属系统选项：从当前列表所有角色推导出的顶层机构集合
const systemOptions = computed(() => {
  const set = new Set<string>();
  for (const [名] of 当前列表.value) {
    set.add(推导顶层机构(名));
  }
  return [...set].sort();
});

// 安全状态排序权重
const safetyWeight: Record<string, number> = {
  已死亡: 0,
  失踪: 1,
  危险: 2,
  需要医护: 3,
  受伤: 4,
  安全: 5,
};

const filtered = computed(() => {
  const kw = searchText.value.trim().toLowerCase();
  let list = 当前列表.value.filter(([, c]) => {
    // 人身安全筛选
    if (filterSafety.value && c.人身安全 !== filterSafety.value) return false;
    // 所属系统筛选
    if (filterSystem.value && 推导顶层机构(c.姓名 ?? '') !== filterSystem.value) return false;
    // 搜索：姓名/职务/履历
    if (kw) {
      const 姓名匹配 = (c.姓名 || '').toLowerCase().includes(kw);
      const 职务匹配 = (c.当前职务 || '').toLowerCase().includes(kw);
      const 履历匹配 = (c.履历 ?? []).some((it: any) => `${it.事件 || ''} ${it.时间 || ''}`.toLowerCase().includes(kw));
      if (!姓名匹配 && !职务匹配 && !履历匹配) return false;
    }
    return true;
  });

  // 排序
  list = [...list].sort((a, b) => {
    if (sortBy.value === '姓名') return (a[1].姓名 || a[0]).localeCompare(b[1].姓名 || b[0], 'zh');
    if (sortBy.value === '安全') {
      const wa = safetyWeight[a[1].人身安全] ?? 6;
      const wb = safetyWeight[b[1].人身安全] ?? 6;
      return wa - wb; // 危险在前
    }
    if (sortBy.value === '职务') return (a[1].当前职务 || '').localeCompare(b[1].当前职务 || '', 'zh');
    return 0;
  });

  return list;
});

// ── 分页 ──
const pageSize = 24;
const page = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

// 切换 Tab / 筛选条件时回到第一页
watch([subTab, searchText, filterSystem, filterSafety, sortBy], () => {
  page.value = 1;
});

function onInspect(名: string) {
  editingName.value = 名;
}

// ── 编辑：增删 ──
function onDelete(名: string) {
  if (!confirm(`确认删除角色「${名}」？此操作不可撤销。`)) return;
  const 表 = subTab.value === '群友' ? 群友角色表.value : 非群友角色表.value;
  delete 表[名];
  // 若当前正打开被删除角色的弹窗，关闭它
  if (editingName.value === 名) editingName.value = '';
}

function onAdd() {
  const 表 = subTab.value === '群友' ? 群友角色表.value : 非群友角色表.value;
  const 基数 = Object.keys(表).length;
  const 新名 = `新角色 ${基数 + 1}`;
  if (subTab.value === '群友') {
    表[新名] = {
      姓名: 新名,
      性别: '男',
      年龄: 25,
      当前职务: '无',
      当前位置: '安徽当涂县长江南岸基地车',
      当前活动: '等待分配任务',
      关系动态: '',
      人身安全: '安全',
      履历: [{ 时间: store.data?.世界?.当前日期 || '1905-05-10', 事件: '新增角色', 来源: 'GM' }],
    };
  } else {
    表[新名] = {
      姓名: 新名,
      性别: '男',
      年龄: 30,
      来源: '本地',
      对穿越者态度: '未知',
      当前职务: '无',
      当前位置: '',
      当前活动: '',
      人身安全: '安全',
      履历: [{ 时间: store.data?.世界?.当前日期 || '1905-05-10', 事件: '新增角色', 来源: 'GM' }],
    };
  }
  editingName.value = 新名;
}
</script>

<style lang="scss" scoped>
.char-grid-panel {
  padding: 4px 2px;
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.grid-kicker {
  margin: 0;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.grid-header h3 {
  margin: 2px 0 0;
  color: var(--qyc-ink);
  font-family: var(--qyc-font-title);
  font-size: 16px;
  font-weight: 800;
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

.sub-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--qyc-line);
}

.sub-tab {
  position: relative;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-ui);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.sub-tab.active {
  color: var(--qyc-vermilion);
}

.sub-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--qyc-vermilion);
}

.count {
  margin-left: 4px;
  color: var(--qyc-ink-faint);
  font-size: 11px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-light);
}

.search-input {
  flex: 1 1 160px;
  min-width: 120px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.filter-label {
  color: var(--qyc-ink-faint);
  white-space: nowrap;
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

.empty-hint {
  padding: 24px;
  text-align: center;
  color: var(--qyc-ink-faint);
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  padding: 8px 0;
  border-top: 1px dashed var(--qyc-line);
}

.pager-btn {
  height: 28px;
  border: 1px solid var(--qyc-line-strong);
  border-radius: 6px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink-dim);
  font-size: 12px;
  padding: 0 10px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.pager-btn:hover:not(:disabled) {
  border-color: var(--qyc-vermilion);
  color: var(--qyc-vermilion);
}

.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-info {
  color: var(--qyc-ink-faint);
  font-size: 12px;
}

.edit-zone {
  margin-top: 12px;
  padding: 10px;
  border: 1px dashed var(--qyc-vermilion-faded);
  border-radius: 8px;
  background: rgba(184, 56, 30, 0.04);
}

.add-btn {
  height: 30px;
  border: 1px solid var(--qyc-vermilion);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  color: var(--qyc-vermilion);
  font-size: 13px;
  font-weight: 700;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.add-btn:hover {
  background: rgba(184, 56, 30, 0.08);
}

.edit-hint {
  margin: 8px 0 0;
  color: var(--qyc-ink-faint);
  font-size: 11px;
}
</style>
