import feedReducer, {
  setCustomOrder,
  reorderCards,
  resetCustomOrder,
  setActiveFilter,
  setSearchQuery,
  FeedState,
} from '@/features/feed/feedSlice';

describe('feedSlice', () => {
  const initialState: FeedState = {
    customOrder: ['item-1', 'item-2', 'item-3'],
    activeFilter: 'all',
    searchQuery: '',
  };

  it('handles setCustomOrder', () => {
    const state = feedReducer(initialState, setCustomOrder(['item-3', 'item-1']));
    expect(state.customOrder).toEqual(['item-3', 'item-1']);
  });

  it('handles reorderCards moving item to new position', () => {
    const state = feedReducer(initialState, reorderCards({ activeId: 'item-1', overId: 'item-3' }));
    expect(state.customOrder).toEqual(['item-2', 'item-3', 'item-1']);
  });

  it('handles resetCustomOrder', () => {
    const state = feedReducer(initialState, resetCustomOrder());
    expect(state.customOrder).toEqual([]);
  });

  it('handles setActiveFilter and setSearchQuery', () => {
    let state = feedReducer(initialState, setActiveFilter('movie'));
    expect(state.activeFilter).toBe('movie');

    state = feedReducer(state, setSearchQuery('quantum'));
    expect(state.searchQuery).toBe('quantum');
  });
});
