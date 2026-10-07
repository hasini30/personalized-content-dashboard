import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  bio?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.status = action.payload ? 'authenticated' : 'unauthenticated';
    },
    setAuthStatus: (state, action: PayloadAction<AuthState['status']>) => {
      state.status = action.payload;
      if (action.payload === 'unauthenticated') {
        state.user = null;
        state.isAuthenticated = false;
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'unauthenticated';
    },
  },
});

export const { setAuthUser, setAuthStatus, updateUserProfile, logout } = authSlice.actions;

export default authSlice.reducer;
