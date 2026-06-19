// ============================================================
// 群友群穿/types.ts
// zod 推导类型
// ============================================================

import { Schema as RootSchema } from './mvu_schema';

export type Schema = z.output<typeof RootSchema>;
export type MvuData = Schema;
