<template>
  <div class="personnel-panel">
    <div class="watermark" aria-hidden="true">PERSONNEL</div>

    <header class="panel-header">
      <div>
        <p class="panel-kicker">CADRE RECORDS</p>
        <h3>📋 人事案卷</h3>
      </div>
      <button type="button" class="edit-btn" :class="{ active: editing }" @click="editing = !editing">
        {{ editing ? '✓ 完成' : '✎ 编辑' }}
      </button>
    </header>

    <section class="section-card principle-card">
      <div class="sub-header">
        <h4>干部管理原则</h4>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>
      <textarea v-if="editing" v-model="人事.干部管理原则" class="form-textarea" rows="2"></textarea>
      <p v-else class="principle-text">{{ 人事.干部管理原则 || '未设定' }}</p>
    </section>

    <section class="section-card rank-card">
      <div class="sub-header">
        <h4>职级体系</h4>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>
      <textarea v-if="editing" v-model="人事.职级体系" class="form-textarea" rows="3"></textarea>
      <p v-else class="rank-text">{{ 人事.职级体系 || '未设定' }}</p>
    </section>

    <section class="section-card">
      <div class="sub-header">
        <h4>关键岗位任命记录</h4>
        <span class="record-count">近 {{ appointments.length }} 条</span>
        <button v-if="editing" type="button" class="small-btn" @click="addAppointment">＋ 任命</button>
      </div>
      <div class="divider-ornament" aria-hidden="true">✦ ✦ ✦</div>

      <div v-if="appointments.length === 0" class="empty-hint">暂无任命记录</div>
      <ol v-else class="timeline">
        <li v-for="(record, index) in appointments" :key="index" class="timeline-item">
          <div class="timeline-rail">
            <span class="time-diamond">◆</span>
            <span v-if="index < appointments.length - 1" class="rail-line"></span>
          </div>
          <div class="appointment-card">
            <div class="card-title-row">
              <span class="case-no">№ {{ String(index + 1).padStart(3, '0') }}</span>
              <input
                v-if="editing"
                v-model="record.任命时间"
                type="text"
                class="form-input time-input"
                placeholder="任命时间"
              />
              <time v-else>{{ record.任命时间 || '未知时间' }}</time>
              <button v-if="editing" type="button" class="danger-btn" @click="appointments.splice(index, 1)">✕</button>
            </div>

            <div class="field-grid">
              <label>
                <span>岗位</span>
                <input v-if="editing" v-model="record.岗位" type="text" class="form-input" />
                <strong v-else class="post-name">{{ record.岗位 || '未指派' }}</strong>
              </label>
              <label>
                <span>任命人</span>
                <input v-if="editing" v-model="record.任命人" type="text" class="form-input" />
                <b v-else>{{ record.任命人 || '未知' }}</b>
              </label>
              <label>
                <span>任命主体</span>
                <input v-if="editing" v-model="record.任命主体" type="text" class="form-input" />
                <b v-else>{{ record.任命主体 || '未知' }}</b>
              </label>
            </div>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDataStore } from '../store';

const store = useDataStore() as any;
const editing = ref(false);

watch(
  () => store.data,
  data => {
    data.组织结构 ??= {};
    if (!data.组织结构.人事) {
      data.组织结构.人事 = {
        干部管理原则: '',
        职级体系: '',
        关键岗位任命记录: [],
      };
    }
    data.组织结构.人事.关键岗位任命记录 ??= [];
  },
  { immediate: true, once: true },
);

const 人事 = computed<any>(() => store.data.组织结构.人事 ?? {});
const appointments = computed<any[]>(() => 人事.value.关键岗位任命记录 ?? []);

function addAppointment() {
  appointments.value.push({
    岗位: '新岗位',
    任命人: '待定',
    任命主体: '待定',
    任命时间: store.data?.世界?.当前日期 || '1905-05-10',
  });
}
</script>

<style lang="scss" scoped>
.personnel-panel {
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
}

.watermark {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 56px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 0.04;
  pointer-events: none;
  z-index: 0;
}

.panel-header,
.section-card {
  position: relative;
  z-index: 1;
}

.panel-header,
.sub-header,
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-kicker {
  margin: 0 0 3px;
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

h3,
h4,
p {
  margin: 0;
}

h3 {
  font-size: 17px;
}

h4 {
  color: var(--qyc-ink);
  font-size: 15px;
}

.section-card {
  border: 1px solid var(--qyc-line);
  border-radius: 12px;
  background: var(--qyc-paper-light);
  box-shadow: 0 2px 8px rgba(44, 24, 16, 0.06);
  padding: 11px;
}

.record-count {
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
}

.divider-ornament {
  margin: 6px 0 10px;
  color: var(--qyc-vermilion-faded);
  font-size: 10px;
  letter-spacing: 0.4em;
  text-align: center;
  opacity: 0.7;
}

.principle-text,
.rank-text {
  color: var(--qyc-ink-dim);
  font-size: 14px;
  line-height: 1.55;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-diamond {
  color: var(--qyc-vermilion);
  font-size: 12px;
  line-height: 1;
}

.rail-line {
  width: 2px;
  flex: 1;
  margin-top: 2px;
  background: linear-gradient(180deg, var(--qyc-vermilion-faded), transparent);
}

.appointment-card {
  border: 1px solid var(--qyc-line);
  border-radius: 10px;
  background: var(--qyc-paper);
  padding: 10px;
}

.case-no {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.time-input {
  flex: 1;
  min-width: 0;
  font-family: var(--qyc-font-mono);
  font-size: 12px;
}

time {
  color: var(--qyc-ink-faint);
  font-family: var(--qyc-font-mono);
  font-size: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.field-grid span {
  display: block;
  color: var(--qyc-ink-faint);
  font-size: 11px;
  margin-bottom: 4px;
}

.post-name {
  color: var(--qyc-vermilion);
  font-family: var(--qyc-font-title);
  font-size: 14px;
  font-weight: 800;
}

.field-grid b {
  color: var(--qyc-ink);
  font-size: 13px;
}

.edit-btn,
.small-btn,
.danger-btn {
  border: 1px solid var(--qyc-line-strong);
  border-radius: 8px;
  background: transparent;
  color: var(--qyc-ink-dim);
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
  cursor: pointer;
}

.edit-btn.active,
.small-btn:hover {
  border-color: var(--qyc-vermilion);
  background: rgba(184, 56, 30, 0.08);
  color: var(--qyc-vermilion);
}

.danger-btn {
  color: var(--qyc-danger);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  border: 1px solid var(--qyc-line);
  border-radius: 8px;
  background: var(--qyc-paper-light);
  color: var(--qyc-ink);
  font-size: 13px;
  padding: 6px 8px;
}

.form-textarea {
  resize: vertical;
}

.empty-hint {
  padding: 10px;
  color: var(--qyc-ink-faint);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 360px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
