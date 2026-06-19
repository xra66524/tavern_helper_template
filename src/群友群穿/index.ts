import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';

import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from './mvu_schema';
import { registerMvuFallbackGuards } from './脚本/兜底校验';

$(() => {
  registerMvuSchema(Schema);
  registerMvuFallbackGuards();
});
