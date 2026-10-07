import authReducer, {
  setAuthUser,
  setAuthStatus,
  updateUserProfile,
  logout,
  AuthState,
  UserProfile,
} from '@/features/auth/authSlice';

describe('authSlice', () => {
  const initialUserState: UserProfile = {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    role: 'Architect',
    bio: 'Systems builder',
  };

  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    status: 'idle',
  };

  it('handles setAuthUser', () => {
    const state = authReducer(initialState, setAuthUser(initialUserState));
    expect(state.user).toEqual(initialUserState);
    expect(state.isAuthenticated).toBe(true);
    expect(state.status).toBe('authenticated');
  });

  it('handles updateUserProfile', () => {
    let state = authReducer(initialState, setAuthUser(initialUserState));
    state = authReducer(state, updateUserProfile({ name: 'Alex Updated', role: 'Staff Eng' }));
    expect(state.user?.name).toBe('Alex Updated');
    expect(state.user?.role).toBe('Staff Eng');
    expect(state.user?.email).toBe('alex@example.com');
  });

  it('handles logout and setAuthStatus unauthenticated', () => {
    let state = authReducer(initialState, setAuthUser(initialUserState));
    state = authReducer(state, logout());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.status).toBe('unauthenticated');

    state = authReducer(state, setAuthStatus('loading'));
    expect(state.status).toBe('loading');
  });
});
