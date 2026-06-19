import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Schema } from '../../2039_mvu/mvu_schema';
import type { MvuData } from '../../2039_mvu/types';
import { mockMvuData } from './mockData';

const isLocalMockMode = () => {
  const href = globalThis.location?.href ?? '';
  return href.startsWith('file:') || href.includes('mock=1') || href.includes('#mock');
};

const useMockDataStore = defineStore('mvu_data.2039_ui.mock', () => {
  const data = ref(mockMvuData as MvuData);
  return { data };
});

const useRealDataStore = defineStore('mvu_data.message.2039_ui.main', () => {
  const variableOption: VariableOption = {
    type: 'message',
    message_id: getCurrentMessageId(),
  };
  const initial = Schema.safeParse(_.get(getVariables(variableOption), 'stat_data', {}));
  const data = ref((initial.success ? initial.data : {}) as MvuData);

  useIntervalFn(() => {
    const result = Schema.safeParse(_.get(getVariables(variableOption), 'stat_data', {}));
    if (result.success && !_.isEqual(data.value, result.data)) {
      data.value = result.data as MvuData;
    }
  }, 2000);

  return { data };
});

export const useDataStore = () => (isLocalMockMode() ? useMockDataStore() : useRealDataStore());
