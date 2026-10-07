'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  User,
  Briefcase,
  FileText,
  UserPlus,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
];

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  // Sign Up state
  const [signupName, setSignupName] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupRole, setSignupRole] = React.useState('');
  const [signupBio, setSignupBio] = React.useState('');
  const [selectedAvatar, setSelectedAvatar] = React.useState(PRESET_AVATARS[0]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setErrorMessage(
        t('auth.invalidCredentials') ||
          'Invalid credentials. Please verify your email and password, or use quick demo accounts.'
      );
    } else if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setIsLoading(false);
      setErrorMessage(t('auth.fillAllFields') || 'Please fill in all required fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setIsLoading(false);
      setErrorMessage(t('auth.passwordLength') || 'Password must be at least 6 characters long.');
      return;
    }

    try {
      // Register user via API endpoint
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          role: signupRole.trim() || 'FeedPulse Member',
          bio: signupBio.trim() || 'Active member exploring personalized content.',
          avatar: selectedAvatar,
        }),
      });

      if (!registerRes.ok) {
        const errorData = await registerRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create account');
      }

      setSuccessMessage(
        t('auth.accountCreated') || 'Account created successfully! Signing you in...'
      );

      // Authenticate with the new credentials immediately
      const result = await signIn('credentials', {
        email: signupEmail.trim(),
        password: signupPassword,
        redirect: false,
        callbackUrl,
      });

      setIsLoading(false);

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setErrorMessage(
          t('auth.signInFailed') ||
            'Registration succeeded, but automatic sign in failed. Please sign in manually.'
        );
        setMode('signin');
        setEmail(signupEmail);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage(
        t('auth.signupError') || 'An error occurred during registration. Please try again.'
      );
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setIsLoading(true);
    setErrorMessage(null);

    signIn('credentials', {
      email: demoEmail,
      password: 'password123',
      redirect: false,
      callbackUrl,
    }).then((res) => {
      setIsLoading(false);
      if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setErrorMessage(t('auth.quickLoginFailed') || 'Quick login failed. Please try again.');
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand logo */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md text-lg">
              FP
            </div>
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              FeedPulse
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            {t('auth.tagline') ||
              'Unlock personalized news streams, real-time live feeds, and custom profiles.'}
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-3">
            {/* Tabs for Sign In vs Sign Up */}
            <div className="flex rounded-lg bg-muted p-1 mb-3">
              <button
                type="button"
                data-testid="signin-tab"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === 'signin'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{t('auth.signIn') || 'Sign In'}</span>
              </button>

              <button
                type="button"
                data-testid="signup-tab"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === 'signup'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t('auth.signUp') || 'Create Account'}</span>
              </button>
            </div>

            <CardTitle className="text-xl">
              {mode === 'signin'
                ? t('auth.welcomeBack') || 'Sign in to your account'
                : t('auth.joinFeedPulse') || 'Create your FeedPulse account'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? t('auth.enterCredentials') ||
                  'Enter your credentials or choose a quick demo profile.'
                : t('auth.customizeDetails') ||
                  'Fill in your details and select an avatar to get started.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 animate-in fade-in"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Mode: SIGN IN */}
            {mode === 'signin' && (
              <>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="signin-email"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t('auth.email') || 'Email address'}</span>
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signin-password"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t('auth.password') || 'Password'}</span>
                    </label>
                    <input
                      id="signin-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="signin-submit-button"
                    className="w-full font-semibold"
                    isLoading={isLoading}
                  >
                    <span>{t('auth.signIn') || 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-semibold">
                      {t('auth.demoAccounts') || 'Demo Fast-Track'}
                    </span>
                  </div>
                </div>

                {/* Quick demo accounts */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin('alex@example.com')}
                    disabled={isLoading}
                    className="w-full justify-start text-xs font-normal"
                  >
                    <UserCheck className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-foreground">
                        Alex Rivera (Software Architect)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        alex@example.com • Tech & AI
                      </span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin('priya@example.com')}
                    disabled={isLoading}
                    className="w-full justify-start text-xs font-normal"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2 text-purple-500 shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-foreground">
                        Priya Sharma (Media Curator)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        priya@example.com • Cinema & Markets
                      </span>
                    </div>
                  </Button>
                </div>
              </>
            )}

            {/* Mode: SIGN UP */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.fullName') || 'Full Name'} *</span>
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-email"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.email') || 'Email address'} *</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-password"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.password') || 'Password'} (min 6 chars) *</span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-role"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.headline') || 'Headline / Role'}</span>
                  </label>
                  <input
                    id="signup-role"
                    type="text"
                    placeholder="e.g. AI Researcher & Tech Enthusiast"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-bio"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t('auth.bio') || 'Bio'}</span>
                  </label>
                  <textarea
                    id="signup-bio"
                    rows={2}
                    placeholder="Tell us a bit about topics and cinema you love..."
                    value={signupBio}
                    onChange={(e) => setSignupBio(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {/* Avatar Picker */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    {t('auth.selectAvatar') || 'Choose an Avatar'}
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {PRESET_AVATARS.map((url, i) => {
                      const isSelected = selectedAvatar === url;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedAvatar(url)}
                          className={`relative h-10 w-10 rounded-full overflow-hidden shrink-0 border-2 transition-transform hover:scale-105 ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/40 scale-105'
                              : 'border-border opacity-70'
                          }`}
                        >
                          <Image
                            src={url}
                            alt={`Avatar option ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="signup-submit-button"
                  className="w-full font-semibold mt-2"
                  isLoading={isLoading}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  <span>{t('auth.createAccount') || 'Create Account & Sign In'}</span>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground underline">
            {t('auth.returnGuest') || 'Return to Dashboard as Guest'}
          </Link>
        </div>
      </div>
    </div>
  );
}
