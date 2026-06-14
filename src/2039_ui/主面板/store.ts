import { defineMvuDataStore } from '@util/mvu';
import { Schema } from '../../2039_mvu/mvu_schema';

export const useDataStore = defineMvuDataStore(Schema, {
  type: 'message',
  message_id: getCurrentMessageId(),
});
