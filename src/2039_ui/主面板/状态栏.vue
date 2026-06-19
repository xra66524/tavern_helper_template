<template>
  <div class="status-bar" @click="emit('click')">
    <div class="status-header">
      <div class="title-block">
        <span class="title-mark">2039</span>
        <span class="title-text">政局监测面板</span>
      </div>
      <span class="live-indicator" :class="{ mock: !hasData }">
        <span class="live-dot"></span>
        {{ hasData ? 'LIVE' : 'NO DATA' }}
      </span>
    </div>
    <div class="status-console">
      <span class="console-item" @click.stop="toggleTip('date')">
        <span class="console-label">DATE</span>
        <span class="console-value">{{ world.当前日期 || '----.--.--' }}</span>
      </span>
      <span class="console-item" @click.stop="toggleTip('time')">
        <span class="console-label">TIME</span>
        <span class="console-value">{{ world.当前时间 || '--:--' }}</span>
      </span>
      <span class="console-item mode" @click.stop="toggleTip('mode')">
        <span class="console-label">MODE</span>
        <span class="console-value">{{ world.选举模式 || '--' }}</span>
      </span>
    </div>
    <div class="status-row-1">
      <span class="phase-tag" @click.stop="toggleTip('phase')">
        <span class="tag-label">阶段</span>
        <strong class="tag-value">{{ world.政治阶段 || '--' }}</strong>
      </span>
      <span class="pm-tag" @click.stop="toggleTip('pm')">
        <span class="tag-label">首相</span>
        <strong class="tag-value">{{ primeMinisterText }}</strong>
      </span>
      <span class="crisis-tag" @click.stop="toggleTip('crisis')">
        <span class="tag-label">危机</span>
        <strong class="tag-value">{{ data.$整体危机等级 || '--' }}</strong>
      </span>
    </div>
    <div class="status-matrix">
      <span class="secondary-tag stability-tag" @click.stop="toggleTip('stability')"
        ><span class="s-label">稳定</span> <strong>{{ stabilityText }}</strong></span
      >
      <span class="secondary-tag pressure-tag" @click.stop="toggleTip('pressure')"
        ><span class="s-label">外压</span> <strong>{{ data.$外部压力指数 || '--' }}</strong></span
      >
      <span class="secondary-tag legitimacy-tag" @click.stop="toggleTip('legitimacy')"
        ><span class="s-label">合法</span> <strong>{{ data.$执政合法性 || '--' }}</strong></span
      >
      <span class="secondary-tag control-tag" @click.stop="toggleTip('control')"
        ><span class="s-label">控制</span> <strong>{{ data.$政府控制力 || '--' }}</strong></span
      >
      <span class="secondary-tag economy-tag" @click.stop="toggleTip('economy')"
        ><span class="s-label">通胀</span> <strong>{{ domestic.通胀等级 || '--' }}</strong></span
      >
      <span class="secondary-tag security-tag" @click.stop="toggleTip('security')"
        ><span class="s-label">治安</span> <strong>{{ domestic.治安等级 || '--' }}</strong></span
      >
    </div>
    <!-- 点击展开的注释气泡 -->
    <Transition name="tip-fade">
      <div v-if="activeTip" class="tip-bubble" @click.stop>
        <span class="tip-title">{{ tipMeta[activeTip]?.title }}</span>
        <span class="tip-desc">{{ tipMeta[activeTip]?.desc }}</span>
        <template v-if="tipInterpretation">
          <div class="tip-divider"></div>
          <span class="tip-interp">当前解读：{{ tipInterpretation }}</span>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { MvuData } from '../../2039_mvu/types';
import { useDataStore } from './store';

const emit = defineEmits<{
  click: [];
}>();

const store = useDataStore();
const data = computed(() => store.data as MvuData);
const world = computed(() => data.value.世界);
const cabinet = computed(() => data.value.日本执政);
const domestic = computed(() => data.value.日本国内情势);

const hasData = computed(() => Object.keys(data.value).length > 0);
const primeMinisterText = computed(() => {
  const name = cabinet.value.首相姓名;
  const status = cabinet.value.首相状态;
  if (name && status) return `${name} / ${status}`;
  return name || status || '--';
});
const stabilityText = computed(() => {
  const stability = cabinet.value.本届内阁?.内阁稳定度;
  return typeof stability === 'number' ? `${stability}` : '--';
});

// ── 点击展开注释 ──

const activeTip = ref<string | null>(null);

/** 各指标的静态注释 */
const tipMeta: Record<string, { title: string; desc: string }> = {
  date: {
    title: '当前日期',
    desc: '故事内的日期，由AI每轮自动推进。它是所有事件、政策、选举的时间锚点。来源：世界.当前日期',
  },
  time: {
    title: '当前时间',
    desc: '故事内的时间，由AI每轮自动推进。影响场景氛围——深夜时段治安恶化，白天时段政务活动频繁。来源：世界.当前时间',
  },
  mode: {
    title: '选举模式',
    desc: '当前日本首相的产生方式。「正常首相指名」为议会常规流程——执政党推候选人，众参两院投票；「2039特别大选」为互联网全民直选——任何人均可报名参选，经网络初选后再由议会最终指名；「无」表示非选举期。来源：世界.选举模式',
  },
  phase: {
    title: '政治阶段',
    desc: '当前政局所处阶段，由选举进程和首相状态自动推导。七个阶段依次为：遇刺潮末期（政治暗杀频发）→ 看守停摆期（无首相，事务次官会议代政）→ 正常选举期 / 特别大选报名期 → 特别大选初选期 → 特别大选指名期 → 新内阁执政期。来源：世界.政治阶段',
  },
  pm: {
    title: '首相状态',
    desc: '日本内阁总理大臣的当前状态。空位=无人出任首相，权力完全由事务次官会议接管；看守=有人暂代但无正式授权，政策推行困难；新任=刚完成选举/指名，内阁尚未稳定；在任=正常执政中。来源：日本执政.首相姓名 + 日本执政.首相状态',
  },
  crisis: {
    title: '整体危机等级',
    desc: '由国家面临的多维风险综合计分推导——涵盖治安（0-4分）、通胀（0-4分）、政治阶段（0-3分）、粮食供应（0-4分）、能源供应（0-3分）、潜在危机数量。总分≥14为「危急」，≥9为「严重」，≥5为「警戒」，≥2为「注意」，<2为「正常」。来源：$整体危机等级（deriveAll 派生计算）',
  },
  stability: {
    title: '内阁稳定度',
    desc: '当前内阁的执政稳定程度，0-100整数。低于30意味着合法性危机——内阁随时可能倒台；30-50为争议执政——政策推行阻力极大；50-70勉强维持；70以上才算有效执政。稳定度受政策效果、能源供应、选举进程、舆论场等多因素影响。来源：日本执政.本届内阁.内阁稳定度',
  },
  pressure: {
    title: '外部压力指数',
    desc: '由各国际势力（CSAT、美国CIA、朝总联、NATO、俄罗斯GRU、西方情报联盟）的在日行动能力、对日策略倾向、对日本政府态度综合计分推导。评分≥20为「极高」——多国同时在日活跃扩张；≥12为「高」；≥6为「中」；<6为「低」。来源：$外部压力指数（deriveAll 派生计算）',
  },
  legitimacy: {
    title: '执政合法性',
    desc: '衡量当前政权是否具有法理和民意基础。由首相状态、选举进程阶段、主流媒体立场、内阁稳定度综合推导。「合法执政」=政权稳固；「争议执政」=存在质疑但尚能运转；「合法性危机」=政权濒临崩溃；「非法执政」=首相空位且无选举进行中，或事务次官会议被认定为非法。来源：$执政合法性（deriveAll 派生计算）',
  },
  control: {
    title: '政府控制力',
    desc: '反映内阁对官僚体系和各省厅的实际支配能力。由事务次官会议实际权力等级、各省厅内阁掌控度均值、内阁稳定度综合推导。「完全控制」=内阁主导一切；「有效治理」=基本掌控但存在阻力；「勉强维持」=官僚体系与内阁分庭抗礼；「半瘫痪」=内阁已大幅丧失执行力；「停摆」=政府实际上已不运转。来源：$政府控制力（deriveAll 派生计算）',
  },
  economy: {
    title: '通胀等级',
    desc: '当前物价膨胀程度，反映国家经济健康状况。五个等级依次递进：「稳定」=物价正常；「温和通胀」=物价温和上涨，民众尚能承受；「严重通胀」=物价飞涨，日元信任度开始动摇，CSDC开始被民间接受；「恶性通胀」=物价失控，大额纸币受拒，CSDC广泛流通；「货币崩溃」=日元沦为废纸，以物易物或CSDC成为事实货币。来源：日本国内情势.通胀等级',
  },
  security: {
    title: '治安等级',
    desc: '当前社会治安状况，反映国家秩序维持能力。五个等级依次恶化：「正常」=警察体系有效运转；「恶化」=自警团开始活跃，特定区域（歌舞伎町、涩谷）夜间高危；「严峻」=极道影响力大幅上升，警察士气低落，夜间建议不出门；「失控」=警察体系实际瓦解，自警团武装化，宵禁状态；「无政府状态」=完全无序，武装团体割据。来源：日本国内情势.治安等级',
  },
};

/** 根据当前数据值动态生成解读文本 */
const tipInterpretation = computed(() => {
  if (!activeTip.value) return '';
  const key = activeTip.value;

  switch (key) {
    case 'date': {
      const d = world.value.当前日期;
      return d ? `故事进行到 ${d}，当前大事件为「${data.value.世界?.当前大事件 || '无'}」` : '';
    }
    case 'time': {
      const t = world.value.当前时间;
      if (!t) return '';
      const hour = parseInt(t.split(':')[0], 10);
      if (hour >= 22 || hour < 5) return `深夜 ${t}，夜间治安高危时段`;
      if (hour >= 5 && hour < 8) return `清晨 ${t}，新的一天开始`;
      if (hour >= 8 && hour < 18) return `白天 ${t}，政务和活动高峰`;
      return `傍晚 ${t}，夜间治安开始恶化`;
    }
    case 'mode': {
      const m = world.value.选举模式;
      if (m === '2039特别大选') return '当前为互联网全民直选模式——任何人均可报名，恶搞参选与严肃政治并存';
      if (m === '正常首相指名') return '当前为议会常规选举流程——执政党推候选人，众参两院投票';
      if (m === '无') return '当前非选举期，政权处于正常执政或停摆状态';
      return '';
    }
    case 'phase': {
      const p = world.value.政治阶段;
      const map: Record<string, string> = {
        遇刺潮末期: '政治暗杀仍在持续，无人敢竞选首相，国家处于权力真空边缘',
        看守停摆期: '事务次官会议实际掌权，内阁形同虚设，政策推行几乎停滞',
        正常选举期: '议会正在进行常规首相指名流程，各党派角力',
        特别大选报名期: '互联网报名通道已开启，大量候选人涌入，娱乐界人士被蹭热度报名',
        特别大选初选期: '网民正在对候选人进行初选投票，恶搞与严肃参选并存',
        特别大选指名期: '议会进行最终指名投票，决定下一任首相人选',
        新内阁执政期: '新内阁已组建完成，开始正常施政',
      };
      return p ? map[p] || `当前处于「${p}」阶段` : '';
    }
    case 'pm': {
      const status = cabinet.value.首相状态;
      const name = cabinet.value.首相姓名;
      const map: Record<string, string> = {
        空位: '首相职位空缺，国家处于无政府首脑状态，事务次官会议实际代行行政权',
        看守: name
          ? `${name}暂代首相职务，但无正式授权——政策推行困难，随时可能换届`
          : '无人正式出任首相，政府处于临时维持状态',
        新任: name ? `${name}刚刚就任首相，内阁尚未稳定，需尽快证明执政能力` : '新首相刚就任，内阁组建中',
        在任: name ? `${name}正常执政中` : '首相当前正常执政中',
      };
      return status ? map[status] || '' : '';
    }
    case 'crisis': {
      const c = data.value.$整体危机等级;
      const map: Record<string, string> = {
        正常: '国家运行平稳，各项指标在安全范围内',
        注意: '部分地区或领域出现风险信号，需保持关注但尚不需紧急应对',
        警戒: '多个领域同时亮起黄灯，如不采取有效措施可能迅速恶化',
        严重: '国家面临重大危机——治安、经济或粮食供应出现严重问题，内阁必须紧急应对',
        危急: '国家濒临崩溃——多项指标同时爆表，社会秩序可能随时瓦解',
      };
      return c ? map[c] || `当前危机程度为「${c}」` : '';
    }
    case 'stability': {
      const s = cabinet.value.本届内阁?.内阁稳定度;
      if (typeof s !== 'number') return '';
      if (s >= 70) return `稳定度 ${s}/100：内阁执政基础稳固，政策推行阻力较小`;
      if (s >= 50) return `稳定度 ${s}/100：勉强维持执政，需警惕政策失败或外部冲击`;
      if (s >= 30) return `稳定度 ${s}/100：争议执政中——政策推行阻力大，内阁随时可能震荡`;
      return `稳定度 ${s}/100：合法性危机——内阁濒临倒台，可能触发新一轮选举`;
    }
    case 'pressure': {
      const p = data.value.$外部压力指数;
      const map: Record<string, string> = {
        低: '外部势力在日本活动有限，外交压力可控',
        中: '部分外部势力开始活跃，需关注其动向',
        高: '多个国际势力同时在日积极行动，外交局势紧张',
        极高: '外部势力全面渗透日本，国家主权面临严重挑战',
      };
      return p ? map[p] || `当前外部压力为「${p}」` : '';
    }
    case 'legitimacy': {
      const l = data.value.$执政合法性;
      const map: Record<string, string> = {
        合法执政: '政权具有充分的法理和民意基础，执政正当性无争议',
        争议执政: '政权的合法性受到质疑——媒体批判、支持度不足或选举程序争议',
        合法性危机: '政权濒临崩溃——首相空位或事务次官会议被认定为非法',
        非法执政: '当前不存在合法政府，国家处于权力真空状态',
      };
      return l ? map[l] || `当前合法性为「${l}」` : '';
    }
    case 'control': {
      const c = data.value.$政府控制力;
      const map: Record<string, string> = {
        完全控制: '内阁对官僚体系和各省厅拥有绝对控制力，政令畅通',
        有效治理: '内阁基本掌控政府运作，但部分省厅存在官僚自主性',
        勉强维持: '事务次官会议与内阁分庭抗礼，内阁对省厅的指令经常被阳奉阴违',
        半瘫痪: '内阁已大幅丧失执行力，官僚体系自行其是，政策难以落地',
        停摆: '政府实际上已不运转——无首相、无内阁、官僚体系各自为政',
      };
      return c ? map[c] || `当前控制力为「${c}」` : '';
    }
    case 'economy': {
      const e = domestic.value.通胀等级;
      const map: Record<string, string> = {
        稳定: '物价平稳，日元正常流通，经济运行健康',
        温和通胀: '物价温和上涨，民众生活成本有所增加但尚能承受，对经济刺激有一定正面作用',
        严重通胀: '物价飞涨——大米价格可能已达基准价数倍，日元信任度下降，CSDC开始被民间接受作为替代货币',
        恶性通胀: '物价失控——大额纸币受拒，民间转向CSDC或外币，以物易物增多，生命维持餐成为底层民众主要食物来源',
        货币崩溃: '日元已沦为废纸——CSDC成为事实硬通货，黑市交易完全取代正规经济，社会退回到以物易物状态',
      };
      return e ? map[e] || `当前通胀为「${e}」` : '';
    }
    case 'security': {
      const s = domestic.value.治安等级;
      const map: Record<string, string> = {
        正常: '警察体系有效运转，街头安全，夜间出行无忧',
        恶化: '特定区域（歌舞伎町、涩谷中心街）治安恶化，自警团开始活跃，夜间建议谨慎出行',
        严峻: '极道影响力大幅上升——走私、勒索、武装冲突频发；警察士气低落（约30/100），腐败蔓延；自警团武装化加速',
        失控: '警察体系实际瓦解——自警团准军事化，极道与走私集团公开武装巡逻，夜间宵禁状态，普通人不敢出门',
        无政府状态: '完全无序——武装团体割据，暴力成为唯一规则，政府已无力维持任何社会秩序',
      };
      return s ? map[s] || `当前治安为「${s}」` : '';
    }
    default:
      return '';
  }
});

function toggleTip(key: string) {
  activeTip.value = activeTip.value === key ? null : key;
}

/** 点击外部关闭气泡 */
function onDocClick() {
  activeTip.value = null;
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
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
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
  font-family: 'Georgia', serif;
}

.title-text {
  color: #e2e8f0;
  font-size: 15px;
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
  font-size: 11px;
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
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  .mode & {
    color: #6d5acf;
  }
}

.console-value {
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.06em;

  .mode & {
    color: #c4b5fd;
  }
}

// ── 核心批示：竖列排放，每行背景填满 ──

.status-row-1 {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// ── 核心批示标签 ──

.phase-tag,
.pm-tag,
.crisis-tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 5px 10px;
  font-size: 13px;
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
  font-size: 12px;
  line-height: 1;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tag-value {
  color: inherit;
  font-size: 14px;
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
  gap: 5px;
  padding: 4px 9px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.06);
  border-left: 2px solid #475569;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;

  .s-label {
    opacity: 0.65;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  strong {
    color: #94a3b8;
    font-size: 14px;
    font-weight: 800;
    font-family: 'Consolas', 'Courier New', monospace;
    letter-spacing: 0.04em;
  }

  // ── 各指标代表色 ──
  &.stability-tag {
    border-left-color: #06b6d4;
    color: #5a9ea8;
    strong {
      color: #67e8f9;
    }
  }
  &.pressure-tag {
    border-left-color: #f97316;
    color: #a87a56;
    strong {
      color: #fdba74;
    }
  }
  &.legitimacy-tag {
    border-left-color: #6366f1;
    color: #898abd;
    strong {
      color: #a5b4fc;
    }
  }
  &.control-tag {
    border-left-color: #3b82f6;
    color: #5a83b8;
    strong {
      color: #93c5fd;
    }
  }
  &.economy-tag {
    border-left-color: #eab308;
    color: #a39848;
    strong {
      color: #fde047;
    }
  }
  &.security-tag {
    border-left-color: #22c55e;
    color: #4a8a58;
    strong {
      color: #86efac;
    }
  }
}

// ── 点击展开注释气泡 ──

.tip-bubble {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 4px;
  backdrop-filter: blur(6px);
}

.tip-title {
  display: block;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 3px;
}

.tip-desc {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.tip-divider {
  margin: 6px 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.3), transparent);
}

.tip-interp {
  display: block;
  color: #a5b4fc;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

// 气泡过渡动画
.tip-fade-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.tip-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ── 可点击项的交互反馈 ──

.console-item,
.phase-tag,
.pm-tag,
.crisis-tag,
.secondary-tag {
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.15);
  }

  &:active {
    filter: brightness(0.95);
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
    font-size: 11px;
    border-radius: 3px;
    box-shadow: 0 3px 8px rgba(220, 38, 38, 0.3);
    flex-shrink: 0;
  }

  .title-text {
    font-size: 13px;
    letter-spacing: 0.03em;
  }

  .live-indicator {
    font-size: 10px;
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
    font-size: 8px;
    letter-spacing: 0.08em;
  }

  .console-value {
    font-size: 11px;
    letter-spacing: 0.04em;
  }

  .status-row-1 {
    gap: 3px;
  }

  .phase-tag,
  .pm-tag,
  .crisis-tag {
    padding: 3px 7px;
    font-size: 12px;
    gap: 3px;
    border-left-width: 2px;
  }

  .tag-label {
    font-size: 10px;
  }

  .tag-value {
    font-size: 12px;
  }

  .status-matrix {
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    margin-top: 5px;
  }

  .secondary-tag {
    padding: 3px 7px;
    font-size: 12px;
    gap: 3px;

    .s-label {
      font-size: 10px;
    }

    strong {
      font-size: 12px;
    }
  }

  .tip-bubble {
    margin-top: 6px;
    padding: 6px 10px;
  }

  .tip-title {
    font-size: 10px;
  }

  .tip-desc {
    font-size: 9px;
    line-height: 1.45;
  }

  .tip-divider {
    margin: 4px 0;
  }

  .tip-interp {
    font-size: 9px;
    line-height: 1.45;
  }
}
</style>
