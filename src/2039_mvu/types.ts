// ============================================================
// src/2039_mvu/types.ts
// 导出 zod 推导的 TypeScript 类型定义
// ============================================================

import { Schema as RootSchema } from './mvu_schema';

export type Schema = z.output<typeof RootSchema>;
export type MvuData = Schema;
