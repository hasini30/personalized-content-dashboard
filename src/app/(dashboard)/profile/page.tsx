'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  User,
  Mail,
  Shield,
  Heart,
  Sliders,
  LogOut,
  LogIn,
  Sparkles,
  Edit3,
  Check,
  X,
  Camera,
  Briefcase,
  FileText,
  Languages,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { updateUserProfile } from '@/features/auth/authSlice';
import {
  setCategories,
  setContentLanguage,
  Category,
  AVAILABLE_CATEGORIES,
} from '@/features/preferences/preferencesSlice';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { useTranslation } from 'react-i18next';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
];

interface CustomSessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  bio?: string;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { data: session, status, update } = useSession();

  const favoritesCount = useAppSelector((state) => state.favorites.items.length);
  const preferencesCategories = useAppSelector((state) => state.preferences.categories);
  const activeContentLanguage = useAppSelector((state) => state.preferences.contentLanguage);

  const [isEditing, setIsEditing] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Edit Form Fields
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [avatar, setAvatar] = React.useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = React.useState('');
  const [selectedTopics, setSelectedTopics] = React.useState<Category[]>([]);
  const [selectedLang, setSelectedLang] = React.useState(activeContentLanguage);

  // Initialize form state from session or stored custom profile
  React.useEffect(() => {
    if (session?.user) {
      const sessUser = session.user as CustomSessionUser;
      setName(sessUser.name || '');
      setRole(sessUser.role || 'Dashboard Member');
      setBio(sessUser.bio || 'Curating news, tech, and personalized media.');
      setAvatar(sessUser.image || PRESET_AVATARS[0]);
    }
    setSelectedTopics(preferencesCategories);
    setSelectedLang(activeContentLanguage);
  }, [session, preferencesCategories, activeContentLanguage]);

  const toggleCategory = (cat: Category) => {
    setSelectedTopics((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAvatar = customAvatarUrl.trim() || avatar;

    // 1. Update NextAuth Session
    if (update) {
      await update({
        user: {
          name: name.trim(),
          role: role.trim(),
          bio: bio.trim(),
          image: finalAvatar,
        },
      });
    }

    // 2. Update Redux Auth State
    dispatch(
      updateUserProfile({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        avatarUrl: finalAvatar,
      })
    );

    // 3. Update Preferences (topics & language)
    dispatch(setCategories(selectedTopics));
    if (selectedLang !== activeContentLanguage) {
      dispatch(setContentLanguage(selectedLang));
      i18n.changeLanguage(selectedLang);
    }

    // 4. Persist to local storage for guest/mock permanence
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'customUserProfile',
        JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          bio: bio.trim(),
          avatar: finalAvatar,
          categories: selectedTopics,
          contentLanguage: selectedLang,
        })
      );
    }

    // 5. Persist to SQLite Database API
    fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        avatar: finalAvatar,
      }),
    }).catch((err) => console.warn('Database profile sync error:', err));

    fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: selectedTopics,
        contentLanguage: selectedLang,
      }),
    }).catch((err) => console.warn('Database preferences sync error:', err));

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  if (status === 'loading') {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!session?.user) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
            <User className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('profile.signInToView') || 'Sign in to view Profile'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('profile.signInPrompt') ||
              'Sign in or create an account to customize your profile, personalize your topic streams, and save favorites.'}
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="gap-2">
                <LogIn className="h-4 w-4" />
                <span>{t('nav.login') || 'Go to Login'}</span>
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const user = session.user as CustomSessionUser;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('profile.title') || 'User Profile'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('profile.subtitle') ||
                'Manage your profile, customize your personal details, and view your activity.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 text-xs shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                <span>{t('profile.customizeProfile') || 'Customize Profile'}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                <span>{t('profile.cancel') || 'Cancel'}</span>
              </Button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div
            role="status"
            className="p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 animate-in fade-in"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>
              {t('profile.profileSaved') || 'Profile and preferences updated successfully!'}
            </span>
          </div>
        )}

        {/* Profile Card & Customizer */}
        <Card className="overflow-hidden border-border shadow-md">
          <div className="h-28 bg-gradient-to-r from-primary/80 via-purple-600/80 to-indigo-600/80" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 mb-4 gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="relative h-24 w-24 rounded-full ring-4 ring-card bg-card overflow-hidden shadow-md">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || 'User Avatar'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-bold text-2xl">
                      {user.name?.[0] || 'U'}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {user.role || 'Dashboard Member'}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />
                    <span>{user.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('nav.logout') || 'Sign Out'}</span>
                </Button>
              </div>
            </div>

            {/* Customization Form */}
            {isEditing ? (
              <form
                onSubmit={handleSaveProfile}
                className="mt-6 pt-6 border-t border-border space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span>{t('profile.customizeProfile') || 'Customize Profile Details'}</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Changes sync across your session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-name"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t('profile.displayName') || 'Display Name'}</span>
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="edit-role"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t('profile.headline') || 'Headline / Role'}</span>
                    </label>
                    <input
                      id="edit-role"
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-bio"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.bio') || 'Bio'}</span>
                  </label>
                  <textarea
                    id="edit-bio"
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Avatar Picker */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('profile.presetAvatars') || 'Choose Avatar Image'}</span>
                  </span>
                  <div className="flex items-center gap-3 overflow-x-auto py-1">
                    {PRESET_AVATARS.map((url, i) => {
                      const isSelected = avatar === url && !customAvatarUrl;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setAvatar(url);
                            setCustomAvatarUrl('');
                          }}
                          className={`relative h-12 w-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform hover:scale-105 ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/40 scale-105'
                              : 'border-border opacity-70'
                          }`}
                        >
                          <Image
                            src={url}
                            alt={`Avatar preset ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="url"
                    placeholder="Or paste a custom image URL (https://...)"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Preferred Topics */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('settings.topicsTitle') || 'Preferred News Topics'}</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_CATEGORIES.map((cat) => {
                      const isSelected = selectedTopics.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1 text-xs rounded-full border transition-all capitalize ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm'
                              : 'bg-card text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content Language */}
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label
                    htmlFor="edit-lang"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('settings.contentLanguage') || 'Content Language'}</span>
                  </label>
                  <select
                    id="edit-lang"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.short} - {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    {t('profile.cancel') || 'Cancel'}
                  </Button>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>{t('profile.saveChanges') || 'Save Profile'}</span>
                  </Button>
                </div>
              </form>
            ) : (
              /* User Bio Display */
              user.bio && (
                <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Bio</span>
                  </p>
                  <p className="leading-relaxed">{user.bio}</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Account Activity & Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                <span>{t('profile.savedOffline') || 'Saved Offline'}</span>
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{favoritesCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground">Articles & media saved to your device</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>{t('profile.activeTopics') || 'Active Topics'}</span>
              </CardDescription>
              <CardTitle className="text-2xl font-bold">{preferencesCategories.length}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground">Preferred categories selected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t('profile.authStatus') || 'Authentication'}</span>
              </CardDescription>
              <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('profile.verifiedSession') || 'Verified Session'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground">Active JWT Bearer credentials</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
