import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../../src/群友群穿/mvu_schema';

export const useDataStore = defineMvuDataStore(Schema, { type: 'message', message_id: getCurrentMessageId() });