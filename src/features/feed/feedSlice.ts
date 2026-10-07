import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FeedState {
  customOrder: string[]; // ContentItem IDs in user-ordered sequence
  activeFilter: 'all' | 'news' | 'movie' | 'social';
  searchQuery: string;
  readItemIds?: string[];
}

const initialState: FeedState = {
  customOrder: [],
  activeFilter: 'all',
  searchQuery: '',
  readItemIds: [],
};

export const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setCustomOrder: (state, action: PayloadAction<string[]>) => {
      state.customOrder = action.payload;
    },
    reorderCards: (state, action: PayloadAction<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = action.payload;
      const oldIndex = state.customOrder.indexOf(activeId);
      const newIndex = state.customOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        state.customOrder.splice(oldIndex, 1);
        state.customOrder.splice(newIndex, 0, activeId);
      }
    },
    resetCustomOrder: (state) => {
      state.customOrder = [];
    },
    setActiveFilter: (state, action: PayloadAction<'all' | 'news' | 'movie' | 'social'>) => {
      state.activeFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    markItemAsRead: (state, action: PayloadAction<string>) => {
      if (!state.readItemIds) {
        state.readItemIds = [];
      }
      if (!state.readItemIds.includes(action.payload)) {
        state.readItemIds.push(action.payload);
      }
    },
    clearReadingHistory: (state) => {
      state.readItemIds = [];
    },
  },
});

export const {
  setCustomOrder,
  reorderCards,
  resetCustomOrder,
  setActiveFilter,
  setSearchQuery,
  markItemAsRead,
  clearReadingHistory,
} = feedSlice.actions;

export default feedSlice.reducer;
