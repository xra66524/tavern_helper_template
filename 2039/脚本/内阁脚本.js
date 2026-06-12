import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  世界: z.object({
    当前时间: z.string(),
    当前日期: z.string(),
    国际大事件: z.string(),
  }),

  各角色情况: z.record(
    z.string().describe('角色名'),
    z.object({
      当前职位: z.string(),
      近期事务: z.string(),
      目前任务: z.string(),
      身体状况: z.enum(['健康', '亚健康', '生病', '重病']),
    }),
  ),

  日本国内情况: z.object({
    主要政治势力: z.record(
      z.string().describe('势力名'),
      z.object({
        政治光谱: z.string(),
        政治诉求: z.string(),
        主要势力范围: z.string(),
        支持度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
        领导人: z.string(),
        主要人物: z.record(z.string().describe('人物名'), z.string().describe('职务或简介')),
      }),
    ),
  }),

  日本政府情况: z.object({
    日元对CSDC汇率: z.coerce.number(),
    日元对美元汇率: z.coerce.number(),
    国内GDP总值: z.string(),
    失业率: z.coerce.number(),
    民意支持率: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
    本届内阁届数: z.coerce.number(),
    本届内阁持续时间: z.string(),
    内阁目前任务: z.string(),
    各省厅: z.record(
      z.string().describe('省厅名'),
      z.object({
        大臣: z.string(),
        副大臣: z.string(),
        事务次官: z.string(),
        长官: z.string(),
        目前主要处理事务: z.string(),
        现职员人数: z.coerce.number(),
        大致职责范围: z.string(),
        重要程度: z.coerce.number().transform(v => _.clamp(v, 50, 100)),
        配合度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
        掌控度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
      }),
    ),
  }),

  国际情况: z.object({
    国际大事件: z.string(),
    下一个国际重大会议: z.object({
      名称: z.string(),
      举办时间: z.string(),
    }),
    世界主要国家对日本态度: z.record(
      z.string().describe('国家或政党名'),
      z.object({
        支持度: z.coerce.number().transform(v => _.clamp(v, -100, 100)),
        政治诉求: z.string(),
      }),
    ),
  }),
});

$(() => {
  registerMvuSchema(Schema);
});
