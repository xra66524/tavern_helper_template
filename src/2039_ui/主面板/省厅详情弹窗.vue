<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('close')">
      <article class="ministry-modal" @click.stop>
        <header class="modal-header">
          <div>
            <div class="modal-title">🏢 {{ name }}</div>
          </div>
          <div class="header-actions">
            <button v-if="!editing" type="button" class="edit-btn" @click="startEdit">✎ 编辑</button>
            <button v-if="editing" type="button" class="save-btn" :disabled="saving" @click="saveEdit">
              {{ saving ? '⏳ 保存中' : '✓ 保存' }}
            </button>
            <button v-if="editing" type="button" class="cancel-btn" @click="cancelEdit">↩ 取消</button>
            <button type="button" class="close-btn" @click="handleClose">✕</button>
          </div>
        </header>

        <!-- 基本信息 -->
        <section class="detail-section basic">
          <div class="info-row">
            <span
              >关键性：<strong :style="{ color: criticalityColor }">{{ criticality }}</strong></span
            >
            <span v-if="!editing"
              >运作状态：<strong :style="{ color: statusColor }">{{ displayMinistry.运作状态 || '--' }}</strong></span
            >
            <span v-else class="edit-field">
              运作状态：
              <select v-model="draft.运作状态" class="form-select">
                <option v-for="opt in 省厅运作状态列表" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </span>
          </div>
        </section>

        <!-- 权力归属 -->
        <section class="detail-section">
          <h3>⚡ 权力归属</h3>
          <div class="bar-row">
            <span class="bar-label">内阁掌控度</span>
            <div class="bar-track">
              <span class="bar-fill" :style="{ width: `${cabinetControl}%`, background: cabinetControlColor }"></span>
            </div>
            <strong v-if="!editing" class="bar-num">{{ cabinetControl }}%</strong>
            <input v-else v-model.number="draft.内阁掌控度" type="number" min="0" max="100" class="form-num" />
          </div>
          <div class="bar-row">
            <span class="bar-label">事务次官掌控度</span>
            <div class="bar-track">
              <span class="bar-fill" :style="{ width: `${bureauControl}%`, background: bureauControlColor }"></span>
            </div>
            <strong v-if="!editing" class="bar-num">{{ bureauControl }}%</strong>
            <input v-else v-model.number="draft.事务次官会议掌控度" type="number" min="0" max="100" class="form-num" />
          </div>
          <div class="control-diff">
            <span>掌控度差：{{ controlDiff }}</span>
            <span v-if="controlDiff < -30" class="diff-warning">⚠️ 事务次官会议主导该省厅</span>
          </div>
        </section>

        <!-- 外交取向 -->
        <section class="detail-section">
          <h3>🌐 外交取向</h3>
          <div class="bar-row">
            <span class="bar-label">对CSAT态度</span>
            <div class="bar-track attitude-track">
              <span class="bar-center-line"></span>
              <span class="bar-fill attitude-fill" :style="displayAttitudeBarStyle(displayMinistry.对CSAT态度)"></span>
            </div>
            <strong v-if="!editing" class="bar-num" :style="{ color: csatColor }">{{
              signed(displayMinistry.对CSAT态度)
            }}</strong>
            <input v-else v-model.number="draft.对CSAT态度" type="number" min="-100" max="100" class="form-num" />
          </div>
          <div class="bar-row">
            <span class="bar-label">对美态度</span>
            <div class="bar-track attitude-track">
              <span class="bar-center-line"></span>
              <span class="bar-fill attitude-fill" :style="displayAttitudeBarStyle(displayMinistry.对美态度)"></span>
            </div>
            <strong v-if="!editing" class="bar-num" :style="{ color: usaColor }">{{
              signed(displayMinistry.对美态度)
            }}</strong>
            <input v-else v-model.number="draft.对美态度" type="number" min="-100" max="100" class="form-num" />
          </div>
        </section>

        <!-- 派系归属 -->
        <section class="detail-section">
          <h3>🏷️ 派系归属</h3>
          <template v-if="!editing">
            <span class="faction-tag" :style="{ borderColor: factionColor, color: factionColor }">
              {{ displayMinistry.倾向派系 || '未明确' }}
            </span>
          </template>
          <div v-else class="edit-field">
            <input v-model="draft.倾向派系" type="text" class="form-input" placeholder="输入派系名称" />
          </div>
        </section>

        <!-- 关联政策 -->
        <section class="detail-section">
          <h3>📋 关联政策（{{ relatedPolicies.length }}项）</h3>
          <div v-if="relatedPolicies.length === 0" class="empty-mini">暂无关联政策</div>
          <div v-for="[pName, policy] in relatedPolicies.slice(0, 5)" :key="pName" class="policy-item">
            <span class="policy-name">{{ policy.内容 || pName }}</span>
            <span class="status-chip" :style="policyChipStyle(policy.推行状态)">{{ policy.推行状态 || '--' }}</span>
          </div>
          <button v-if="relatedPolicies.length > 5" type="button" class="link-btn" @click="emit('navigate', 'policy')">
            → 查看全部 {{ relatedPolicies.length }} 项
          </button>
        </section>

        <!-- 主管阁僚 -->
        <section class="detail-section">
          <h3>👤 主管阁僚（大臣）</h3>
          <template v-if="minister">
            <div class="minister-info">
              <span class="minister-position">{{ ministerPosition }}</span>
              <strong class="minister-name" :style="{ borderColor: ministerStanceColor }">{{ minister.姓名 }}</strong>
            </div>
            <div class="minister-details">
              <span
                >对职务理解度：<strong :style="{ color: understandColor }">{{
                  minister.对职务理解度 || '--'
                }}</strong></span
              >
              <span
                >实际履职状态：<strong :style="{ color: dutyColor }">{{ minister.实际履职状态 || '--' }}</strong></span
              >
            </div>
            <button type="button" class="link-btn" @click="emit('navigateToMinister', ministerPosition!)">
              → 查看阁僚详情
            </button>
          </template>
          <div v-else class="empty-mini">空位</div>
        </section>

        <!-- 副大臣 -->
        <section class="detail-section">
          <h3>🔹 副大臣</h3>
          <template v-if="displayMinistry.副大臣?.姓名">
            <!-- 非编辑模式 -->
            <template v-if="!editing">
              <div class="personnel-header">
                <strong class="personnel-name">{{ displayMinistry.副大臣.姓名 }}</strong>
                <span class="status-chip" :style="viceChipStyle">{{ displayMinistry.副大臣.任命方式 || '--' }}</span>
              </div>
              <div class="personnel-grid">
                <span
                  >年龄：<strong>{{ displayMinistry.副大臣.年龄 ?? '--' }}</strong></span
                >
                <span
                  >原身份：<strong>{{ displayMinistry.副大臣.原身份 || '--' }}</strong></span
                >
                <span
                  >政治立场：<strong>{{ displayMinistry.副大臣.政治立场 || '--' }}</strong></span
                >
                <span
                  >对职务理解度：<strong :style="{ color: viceUnderstandColor }">{{
                    displayMinistry.副大臣.对职务理解度 || '--'
                  }}</strong></span
                >
                <span
                  >实际履职：<strong :style="{ color: viceDutyColor }">{{
                    displayMinistry.副大臣.实际履职状态 || '--'
                  }}</strong></span
                >
                <span
                  >对阁僚态度：<strong :style="{ color: viceMinisterAttitudeColor }">{{
                    displayMinistry.副大臣.对阁僚态度 || '--'
                  }}</strong></span
                >
                <span
                  >对官僚态度：<strong :style="{ color: viceBureauAttitudeColor }">{{
                    displayMinistry.副大臣.对官僚态度 || '--'
                  }}</strong></span
                >
                <span
                  >实际效忠：<strong>{{ displayMinistry.副大臣.实际效忠对象 || '--' }}</strong></span
                >
                <span
                  >角色定位：<strong>{{ displayMinistry.副大臣.在阁僚与事务次官之间的角色 || '--' }}</strong></span
                >
                <span
                  >心理状态：<strong>{{ displayMinistry.副大臣.当前心理状态 || '--' }}</strong></span
                >
                <span
                  >更关心的事：<strong>{{ displayMinistry.副大臣.更关心的事 || '--' }}</strong></span
                >
              </div>
            </template>
            <!-- 编辑模式 -->
            <div v-else class="personnel-edit">
              <div class="edit-field">
                姓名：<input v-model="draft.副大臣.姓名" type="text" class="form-input form-short" /> 年龄：<input
                  v-model.number="draft.副大臣.年龄"
                  type="number"
                  class="form-num"
                />
              </div>
              <div class="edit-field">
                原身份：<input v-model="draft.副大臣.原身份" type="text" class="form-input" />
              </div>
              <div class="edit-field">
                政治立场：<input v-model="draft.副大臣.政治立场" type="text" class="form-input form-short" />
                <span class="form-sep">|</span>
                对职务理解度：
                <select v-model="draft.副大臣.对职务理解度" class="form-select">
                  <option v-for="opt in 对职务理解度列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="edit-field">
                对阁僚态度：
                <select v-model="draft.副大臣.对阁僚态度" class="form-select">
                  <option v-for="opt in 副大臣对阁僚态度列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <span class="form-sep">|</span>
                对官僚态度：
                <select v-model="draft.副大臣.对官僚态度" class="form-select">
                  <option v-for="opt in 副大臣对官僚态度列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="edit-field">
                实际效忠对象：<input v-model="draft.副大臣.实际效忠对象" type="text" class="form-input" />
              </div>
              <div class="edit-field">
                角色定位：<input v-model="draft.副大臣.在阁僚与事务次官之间的角色" type="text" class="form-input" />
              </div>
            </div>
          </template>
          <div v-else class="empty-mini">空位</div>
        </section>

        <!-- 事务方一把手 -->
        <section class="detail-section">
          <h3>🔺 {{ bureaucratTitle }}（事务方一把手）</h3>
          <template v-if="displayMinistry.事务次官?.姓名">
            <!-- 非编辑模式 -->
            <template v-if="!editing">
              <div class="personnel-header">
                <strong class="personnel-name">{{ displayMinistry.事务次官.姓名 }}</strong>
                <span class="status-chip" :style="bureaucratChipStyle">{{
                  displayMinistry.事务次官.实权程度 || '--'
                }}</span>
              </div>
              <div class="personnel-grid">
                <span
                  >年龄：<strong>{{ displayMinistry.事务次官.年龄 ?? '--' }}</strong></span
                >
                <span
                  >出身省厅：<strong>{{ displayMinistry.事务次官.出身省厅 || '--' }}</strong></span
                >
                <span
                  >出身派系：<strong :style="{ color: factionColor }">{{
                    displayMinistry.事务次官.出身派系 || '--'
                  }}</strong></span
                >
                <span
                  >对阁僚态度：<strong :style="{ color: bureaucratAttitudeColor }">{{
                    displayMinistry.事务次官.对阁僚态度 || '--'
                  }}</strong></span
                >
                <span
                  >架空方式：<strong>{{ displayMinistry.事务次官.架空阁僚的方式 || '--' }}</strong></span
                >
                <span
                  >对副大臣态度：<strong>{{ displayMinistry.事务次官.对副大臣态度 || '--' }}</strong></span
                >
                <span
                  >会议角色：<strong>{{ displayMinistry.事务次官.在事务次官会议中的角色 || '--' }}</strong></span
                >
                <span
                  >会议盟友：<strong>{{ displayMinistry.事务次官.事务次官会议内盟友 || '--' }}</strong></span
                >
                <span
                  >会议对手：<strong>{{ displayMinistry.事务次官.事务次官会议内对手 || '--' }}</strong></span
                >
                <span
                  >更替方式：<strong>{{ displayMinistry.事务次官.更替方式 || '--' }}</strong></span
                >
                <span
                  >在位时间：<strong>{{ displayMinistry.事务次官.在位时间 || '--' }}</strong></span
                >
                <span
                  >继任者：<strong>{{ displayMinistry.事务次官.继任者 || '--' }}</strong></span
                >
                <span
                  >外部联系：<strong>{{ displayMinistry.事务次官.与外部势力的联系 || '--' }}</strong></span
                >
                <span
                  >个人利益：<strong>{{ displayMinistry.事务次官.个人利益 || '--' }}</strong></span
                >
              </div>
            </template>
            <!-- 编辑模式 -->
            <div v-else class="personnel-edit">
              <div class="edit-field">
                姓名：<input v-model="draft.事务次官.姓名" type="text" class="form-input form-short" /> 年龄：<input
                  v-model.number="draft.事务次官.年龄"
                  type="number"
                  class="form-num"
                />
              </div>
              <div class="edit-field">
                出身省厅：<input v-model="draft.事务次官.出身省厅" type="text" class="form-input form-short" />
                <span class="form-sep">|</span>
                出身派系：
                <select v-model="draft.事务次官.出身派系" class="form-select">
                  <option v-for="opt in 事务次官出身派系列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="edit-field">
                对阁僚态度：
                <select v-model="draft.事务次官.对阁僚态度" class="form-select">
                  <option v-for="opt in 事务次官对阁僚态度列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <span class="form-sep">|</span>
                实权程度：
                <select v-model="draft.事务次官.实权程度" class="form-select">
                  <option v-for="opt in 事务次官实权程度列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="edit-field">
                架空方式：<input v-model="draft.事务次官.架空阁僚的方式" type="text" class="form-input" />
              </div>
              <div class="edit-field">
                对副大臣态度：<input v-model="draft.事务次官.对副大臣态度" type="text" class="form-input form-short" />
                <span class="form-sep">|</span>
                会议角色：<input
                  v-model="draft.事务次官.在事务次官会议中的角色"
                  type="text"
                  class="form-input form-short"
                />
              </div>
              <div class="edit-field">
                会议盟友：<input
                  v-model="draft.事务次官.事务次官会议内盟友"
                  type="text"
                  class="form-input form-short"
                />
                <span class="form-sep">|</span>
                会议对手：<input
                  v-model="draft.事务次官.事务次官会议内对手"
                  type="text"
                  class="form-input form-short"
                />
              </div>
              <div class="edit-field">
                更替方式：
                <select v-model="draft.事务次官.更替方式" class="form-select">
                  <option v-for="opt in 事务次官更替方式列表" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <span class="form-sep">|</span>
                在位时间：<input v-model="draft.事务次官.在位时间" type="text" class="form-input form-short" />
              </div>
              <div class="edit-field">
                外部联系：<input v-model="draft.事务次官.与外部势力的联系" type="text" class="form-input" />
              </div>
            </div>
          </template>
          <div v-else class="empty-mini">空位</div>
        </section>

        <!-- 下属机构 -->
        <section class="detail-section">
          <h3>🏗️ 下属 {{ activeBureauCount }} 个局厅</h3>
          <template v-if="!editing">
            <div class="bureau-grid">
              <div v-for="bureau in activeBureaus" :key="bureau" class="bureau-chip active-chip">▸ {{ bureau }}</div>
            </div>
            <div v-if="activeBureauCount === 0" class="empty-mini">暂无活跃局厅</div>
          </template>
          <div v-else class="bureau-edit-list">
            <div class="bureau-edit-hint">勾选 = 活跃局厅，取消 = 休眠</div>
            <label
              v-for="bureau in allEditableBureaus"
              :key="bureau"
              class="bureau-check-row"
              :class="{ active: isBureauActive(bureau) }"
            >
              <input type="checkbox" :checked="isBureauActive(bureau)" @change="toggleBureauInDraft(bureau)" />
              <span class="bureau-check-name">{{ bureau }}</span>
              <span class="bureau-check-status">{{ isBureauActive(bureau) ? '[活跃]' : '[休眠]' }}</span>
            </label>
            <div class="bureau-add-row">
              <input
                v-model.trim="newBureauName"
                type="text"
                class="form-input bureau-add-input"
                placeholder="输入新局厅名称…"
                @keyup.enter="addCustomBureau"
              />
              <button type="button" class="bureau-add-btn" :disabled="!newBureauName" @click="addCustomBureau">
                + 添加
              </button>
            </div>
          </div>
        </section>

        <!-- 当前焦点 -->
        <section class="detail-section">
          <h3>📝 当前焦点</h3>
          <div v-if="!editing">
            <div v-if="displayMinistry.当前焦点" class="focus-full">{{ displayMinistry.当前焦点 }}</div>
            <div v-else class="empty-mini">暂无焦点事项</div>
          </div>
          <div v-else class="edit-field">
            <textarea v-model="draft.当前焦点" class="form-textarea" rows="3" placeholder="输入当前焦点事项"></textarea>
          </div>
        </section>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  get事务方一把手称呼,
  事务次官出身派系列表,
  事务次官实权程度列表,
  事务次官对阁僚态度列表,
  事务次官更替方式列表,
  副大臣对官僚态度列表,
  副大臣对阁僚态度列表,
  对职务理解度列表,
  省厅与下属机构,
  省厅关键性,
  省厅运作状态列表,
} from '../../2039_mvu/constants';
import type { MvuData } from '../../2039_mvu/types';
import { use省厅面板配置 } from './use省厅面板配置';

type Ministry = MvuData['日本执政']['各省厅'][string];
type Minister = MvuData['日本执政']['本届内阁']['主要阁僚'][string];
type Policy = MvuData['日本执政']['当前政策'][string];

const props = defineProps<{
  name: string;
  ministry: Ministry;
  minister: Minister | null;
  ministerPosition: string | null;
  relatedPolicies: [string, Policy][];
}>();

const emit = defineEmits<{
  close: [];
  navigate: [tab: 'policy' | 'characters'];
  navigateToMinister: [position: string];
}>();

const { config } = use省厅面板配置();

// ── 编辑状态 ──
const editing = ref(false);
const saving = ref(false);
const draft = ref<Ministry>({} as Ministry);

/** 重置草稿为传入的 ministry 快照 */
function resetDraft() {
  const copy = JSON.parse(JSON.stringify(props.ministry));
  if (!Array.isArray(copy.主要下属局厅)) copy.主要下属局厅 = [];
  if (!copy.副大臣) copy.副大臣 = {};
  if (!copy.事务次官) copy.事务次官 = {};
  draft.value = copy;
}

/** 进入编辑模式 */
function startEdit() {
  resetDraft();
  editing.value = true;
}

/** 保存编辑：通过 Mvu API 写入 MVU 变量 */
async function saveEdit() {
  saving.value = true;
  try {
    const mvu_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
    _.set(mvu_data, `stat_data.日本执政.各省厅.${props.name}`, draft.value);
    await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id: getCurrentMessageId() });
    editing.value = false;
  } catch {
    // 写入失败，保留编辑状态
  } finally {
    saving.value = false;
  }
}

/** 取消编辑：丢弃草稿 */
function cancelEdit() {
  editing.value = false;
}

/** 关闭弹窗：编辑中有未保存修改时不做拦截，直接关闭（点击取消会消除编辑状态） */
function handleClose() {
  if (editing.value) {
    cancelEdit();
  }
  emit('close');
}

/** 编辑模式下 ESC 先退出编辑，否则关闭弹窗 */
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (editing.value) {
      cancelEdit();
    } else {
      emit('close');
    }
  }
}

onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => document.removeEventListener('keydown', onKey));

// ── 显示用的数据：编辑中用草稿，否则用原始 props ──
const displayMinistry = computed(() => (editing.value ? draft.value : props.ministry));

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

// ── 运作状态 ──
const statusColor = computed(() => {
  const map: Record<string, string> = { 正常: '#22c55e', 半瘫痪: '#eab308', 停摆: '#ef4444' };
  return map[displayMinistry.value.运作状态 ?? ''] ?? '#64748b';
});

// ── 掌控度 ──
const cabinetControl = computed(() => clamp(displayMinistry.value.内阁掌控度));
const bureauControl = computed(() => clamp(displayMinistry.value.事务次官会议掌控度));
const controlDiff = computed(() => cabinetControl.value - bureauControl.value);

const cabinetControlColor = computed(() => {
  const v = cabinetControl.value;
  if (v <= 25) return '#ef4444';
  if (v <= 50) return '#f97316';
  if (v <= 75) return '#eab308';
  return '#22c55e';
});

const bureauControlColor = computed(() => {
  const v = bureauControl.value;
  if (v <= 25) return '#22c55e';
  if (v <= 50) return '#3b82f6';
  if (v <= 75) return '#eab308';
  return '#ef4444';
});

// ── 态度 ──
const csatColor = computed(() => getAttitudeColor(displayMinistry.value.对CSAT态度));
const usaColor = computed(() => getAttitudeColor(displayMinistry.value.对美态度));

// ── 派系 ──
const factionColor = computed(() => config.value.派系颜色映射[displayMinistry.value.倾向派系] ?? '#64748b');

// ── 阁僚（不可编辑，仅展示） ──
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

const understandColor = computed(() => {
  const map: Record<string, string> = {
    专家: '#22c55e',
    熟练: '#22c55e',
    勉强理解: '#eab308',
    一知半解: '#f97316',
    完全不懂: '#ef4444',
  };
  return map[props.minister?.对职务理解度 ?? ''] ?? '#64748b';
});

const dutyColor = computed(() => {
  const map: Record<string, string> = {
    正常履职: '#22c55e',
    敷衍了事: '#eab308',
    被架空: '#eab308',
    完全摆烂: '#ef4444',
    恐慌中: '#f97316',
    逃避职责: '#f97316',
  };
  return map[props.minister?.实际履职状态 ?? ''] ?? '#64748b';
});

// ── 副大臣态度色 ──
const viceMinisterAttitudeColor = computed(() => {
  const att = displayMinistry.value.副大臣?.对阁僚态度;
  const map: Record<string, string> = {
    忠实辅佐: '#22c55e',
    表面配合暗中掣肘: '#eab308',
    完全听命于事务次官: '#ef4444',
    独立行事: '#3b82f6',
    消极怠工: '#9ca3af',
  };
  return map[att ?? ''] ?? '#64748b';
});

const viceBureauAttitudeColor = computed(() => {
  const att = displayMinistry.value.副大臣?.对官僚态度;
  const map: Record<string, string> = {
    代表阁僚对抗: '#ef4444',
    居中协调: '#22c55e',
    偏向官僚: '#f97316',
    完全被官僚同化: '#eab308',
    与官僚争权: '#3b82f6',
  };
  return map[att ?? ''] ?? '#64748b';
});

const viceUnderstandColor = computed(() => {
  const map: Record<string, string> = {
    专家: '#22c55e',
    熟练: '#22c55e',
    勉强理解: '#eab308',
    一知半解: '#f97316',
    完全不懂: '#ef4444',
  };
  return map[displayMinistry.value.副大臣?.对职务理解度 ?? ''] ?? '#64748b';
});

const viceDutyColor = computed(() => {
  const map: Record<string, string> = {
    正常履职: '#22c55e',
    敷衍了事: '#eab308',
    被架空: '#eab308',
    完全摆烂: '#ef4444',
    恐慌中: '#f97316',
    逃避职责: '#f97316',
  };
  return map[displayMinistry.value.副大臣?.实际履职状态 ?? ''] ?? '#64748b';
});

const viceChipStyle = computed(() => {
  const map: Record<string, string> = {
    正常任命: '#22c55e',
    政治分赃: '#eab308',
    阁僚亲信安插: '#3b82f6',
    事务次官推荐: '#f97316',
    派系妥协: '#9ca3af',
  };
  const color = map[displayMinistry.value.副大臣?.任命方式 ?? ''] ?? '#64748b';
  return { borderColor: color, color };
});

// ── 事务次官态度色 ──
const bureaucratAttitudeColor = computed(() => {
  const att = displayMinistry.value.事务次官?.对阁僚态度;
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

const bureaucratChipStyle = computed(() => {
  const map: Record<string, string> = {
    名义管理: '#22c55e',
    日常运作主导: '#3b82f6',
    政策制定主导: '#eab308',
    完全掌控省厅: '#f97316',
    超越省厅影响力: '#ef4444',
  };
  const color = map[displayMinistry.value.事务次官?.实权程度 ?? ''] ?? '#64748b';
  return { borderColor: color, color };
});

// ── 下属局厅 ──
const newBureauName = ref('');

/** 预定义局厅列表（来自常量） */
const predefinedBureaus = computed(() => 省厅与下属机构[props.name] ?? []);

/** 编辑模式：完整可选局厅 = 预定义 + 草稿中已有的自定义局厅 */
const allEditableBureaus = computed(() => {
  const active = draft.value.主要下属局厅 ?? [];
  const merged = new Set([...predefinedBureaus.value, ...active]);
  return [...merged];
});

/** 查看模式：全部局厅（含草稿中的自定义局厅，如有保存） */
const activeBureaus = computed(() => displayMinistry.value.主要下属局厅 ?? []);
const activeBureauCount = computed(() => activeBureaus.value.length);

/** 编辑模式：新增自定义局厅 */
function addCustomBureau() {
  const name = newBureauName.value;
  if (!name) return;
  if (!Array.isArray(draft.value.主要下属局厅)) {
    draft.value.主要下属局厅 = [];
  }
  // 避免重复
  if (!draft.value.主要下属局厅.includes(name)) {
    draft.value.主要下属局厅.push(name);
  }
  newBureauName.value = '';
}

/** 编辑模式：检查某局厅是否在草稿的活跃列表中 */
function isBureauActive(bureau: string): boolean {
  return (draft.value.主要下属局厅 ?? []).includes(bureau);
}

/** 编辑模式：切换某局厅的活跃/休眠状态 */
function toggleBureauInDraft(bureau: string) {
  if (!Array.isArray(draft.value.主要下属局厅)) {
    draft.value.主要下属局厅 = [];
  }
  const idx = draft.value.主要下属局厅.indexOf(bureau);
  if (idx >= 0) {
    draft.value.主要下属局厅.splice(idx, 1);
  } else {
    draft.value.主要下属局厅.push(bureau);
  }
}

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

function displayAttitudeBarStyle(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { width: '0%' };
  const pct = Math.abs(Math.max(-100, Math.min(100, value)));
  const color = getAttitudeColor(value);
  if (value >= 0) {
    return { width: `${pct}%`, background: color, marginLeft: '50%' };
  }
  return { width: `${pct}%`, background: color, marginRight: '50%', marginLeft: `${50 - pct}%` };
}

function policyChipStyle(value: string) {
  const map: Record<string, string> = {
    提案中: '#94a3b8',
    审议中: '#3b82f6',
    已通过待执行: '#22c55e',
    执行中: '#eab308',
    受阻: '#ef4444',
    搁置: '#64748b',
    废除: '#ef4444',
    已完成: '#22c55e',
  };
  const color = map[value] ?? '#64748b';
  return { borderColor: color, color };
}
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

.ministry-modal {
  width: min(420px, 92vw);
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
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-actions button {
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(2, 6, 23, 0.5);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.edit-btn:hover {
  border-color: #3b82f6;
  color: #60a5fa;
}

.save-btn {
  border-color: rgba(34, 197, 94, 0.35) !important;
  color: #22c55e !important;
}

.save-btn:hover {
  border-color: #22c55e !important;
  background: rgba(34, 197, 94, 0.08) !important;
}

.cancel-btn:hover {
  border-color: #eab308;
  color: #eab308;
}

.close-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.modal-title {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 900;
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

.info-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

// ── 进度条 ──
.bar-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

.bar-label {
  color: #64748b;
  font-weight: 800;
}

.bar-track {
  height: 6px;
  overflow: hidden;
  background: rgba(51, 65, 85, 0.75);

  &.attitude-track {
    position: relative;
  }
}

.bar-fill {
  display: block;
  height: 100%;
  transition: width 0.3s ease;
}

.bar-center-line {
  position: absolute;
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  background: rgba(148, 163, 184, 0.3);
}

.attitude-fill {
  position: absolute;
  top: 0;
  height: 100%;
}

.bar-num {
  color: #e2e8f0;
  font-size: 12px;
}

.control-diff {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.diff-warning {
  color: #f97316;
  font-weight: 800;
}

// ── 派系标签 ──
.faction-tag {
  display: inline-block;
  padding: 3px 8px;
  border-left: 3px solid;
  background: rgba(15, 23, 42, 0.7);
  font-size: 13px;
  font-weight: 800;
}

// ── 政策列表 ──
.policy-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
}

.policy-name {
  flex: 1;
  min-width: 0;
  color: #e2e8f0;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  flex-shrink: 0;
  padding: 1px 5px;
  border-left: 2px solid;
  background: rgba(2, 6, 23, 0.45);
  font-size: 11px;
  font-weight: 800;
}

// ── 阁僚 ──
.minister-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.minister-position {
  color: #64748b;
  font-size: 12px;
}

.minister-name {
  padding-left: 5px;
  border-left: 2px solid;
  color: #f8fafc;
  font-size: 15px;
}

.minister-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #94a3b8;
}

// ── 人事三巨头通用 ──
.personnel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.personnel-name {
  color: #f8fafc;
  font-size: 15px;
}

.personnel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 4px 12px;
  font-size: 12px;
  color: #94a3b8;

  strong {
    color: #cbd5e1;
  }
}

.personnel-edit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-sep {
  color: #475569;
  margin: 0 4px;
}

// ── 下属机构 ──
.bureau-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.bureau-chip {
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.4);
  font-size: 11px;
}

.active-chip {
  color: #cbd5e1;
  font-weight: 800;
}

.dormant-chip {
  color: #64748b;
}

// ── 下属机构编辑模式 ──
.bureau-edit-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
  overflow-y: auto;
}

.bureau-edit-hint {
  margin-bottom: 6px;
  color: #64748b;
  font-size: 11px;
  font-style: italic;
}

.bureau-check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.08);
  }

  &.active .bureau-check-name {
    color: #e2e8f0;
    font-weight: 800;
  }

  input[type='checkbox'] {
    accent-color: #3b82f6;
    cursor: pointer;
  }
}

.bureau-check-name {
  flex: 1;
  min-width: 0;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bureau-check-status {
  flex-shrink: 0;
  font-size: 10px;

  .bureau-check-row.active & {
    color: #22c55e;
    font-weight: 800;
  }

  .bureau-check-row:not(.active) & {
    color: #64748b;
  }
}

.bureau-add-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.bureau-add-input {
  flex: 1;
}

.bureau-add-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 3px;
  background: rgba(59, 130, 246, 0.08);
  color: #60a5fa;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.16);
  }

  &:disabled {
    border-color: rgba(148, 163, 184, 0.1);
    background: transparent;
    color: #475569;
    cursor: not-allowed;
  }
}

// ── 焦点 ──
.focus-full {
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.5;
}

.empty-mini {
  color: #64748b;
  font-size: 12px;
  font-style: italic;
}

.link-btn {
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

@container main-panel (max-width: 430px) {
  .ministry-modal {
    width: 95vw;
    max-height: 75vh;
  }
}

// ── 编辑模式表单 ──
.edit-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-select,
.form-input,
.form-textarea,
.form-num {
  padding: 4px 7px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 3px;
  background: rgba(2, 6, 23, 0.6);
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: #3b82f6;
  }
}

.form-select {
  min-width: 80px;
}

.form-input {
  width: 100%;
}

.form-textarea {
  width: 100%;
  resize: vertical;
  min-height: 56px;
  line-height: 1.45;
  font-family: inherit;
}

.form-num {
  width: 56px;
  text-align: center;
  font-weight: 800;
}
</style>
