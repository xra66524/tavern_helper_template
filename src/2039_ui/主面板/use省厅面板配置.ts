// ============================================================
// src/2039_ui/主面板/use省厅面板配置.ts
// 省厅面板配置 composable：优先从 MVU 变量读取，不存在时降级为 TS 默认值
// ============================================================

import { computed } from 'vue';
import { useDataStore } from './store';
import type { 省厅面板配置类型 } from './省厅面板默认配置';
import { 省厅面板默认配置 } from './省厅面板默认配置';

export function use省厅面板配置() {
  const store = useDataStore();
  const data = computed(() => store.data as any);

  /** 实际生效的配置：MVU 变量 → TS 默认值 fallback */
  const config = computed<省厅面板配置类型>(() => ({
    ...省厅面板默认配置,
    ...(data.value?.世界?.省厅面板配置 ?? {}),
  }));

  /** 仅读取配置（不变），不修改 */
  return { config };
}
