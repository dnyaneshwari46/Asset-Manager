import { useEffect, useRef } from "react";
import { ClerkProvider, SignUp, Show, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// Module-level ref so the getter is registered before any component renders.
// This avoids the race condition where queries fire during render but
// setAuthTokenGetter() would only be called in a useEffect (after paint).
const _authRef = { current: null as (() => Promise<string | null>) | null };
setAuthTokenGetter(() => _authRef.current?.() ?? null);

import HomePage from "./pages/home";
import DashboardPage from "./pages/dashboard";
import ResumeHub from "./pages/resume/index";
import ResumeEdit from "./pages/resume/edit";
import InterviewHub from "./pages/interview/index";
import InterviewRoom from "./pages/interview/room";
import CodingHub from "./pages/coding/index";
import CodingIDE from "./pages/coding/ide";
import LearningDashboard from "./pages/learning";
import AdminPanel from "./pages/admin";
import ProfilePage from "./pages/profile";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#0f0f1d",
    colorInput: "#1e1e2d",
    colorInputForeground: "#f8fafc",
    colorText: "#f8fafc",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f0f1d]/90 backdrop-blur-xl border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-white tracking-tight",
    headerSubtitle: "text-gray-400",
    formFieldLabel: "text-sm font-medium text-gray-300",
    formFieldInput: "bg-[#1e1e2d] border-white/10 text-white focus:border-blue-500 focus:ring-blue-500",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all",
    socialButtonsBlockButton: "border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all",
    socialButtonsBlockButtonText: "text-gray-200 font-medium",
    footerActionText: "text-gray-400",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-medium",
    dividerText: "text-gray-500",
    dividerLine: "bg-white/10",
  },
};

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center relative overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
      <div className="relative z-10">
        <SignUp routing="path" path={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <HomePage />
      </Show>
    </>
  );
}

/** Keeps the module-level auth ref in sync with the current Clerk session.
 *  Runs synchronously during render so the ref is populated before any
 *  sibling component's useQuery fires its first fetch. */
function ClerkAuthBridge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  // Synchronous assignment during render — intentional (no re-render side-effect).
  _authRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;
    // Debug: check what token Clerk returns
    getToken().then(token => {
      console.log("[ClerkAuthBridge] isSignedIn:", isSignedIn, "token:", token ? token.substring(0, 30) + "..." : null);
      // Hit the debug endpoint with the token to see if it verifies
      if (token) {
        fetch("/api/debug-auth", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => console.log("[debug-auth with token]", d))
          .catch(console.error);
      } else {
        fetch("/api/debug-auth")
          .then(r => r.json())
          .then(d => console.log("[debug-auth no token]", d))
          .catch(console.error);
      }
    });
    return () => { _authRef.current = null; };
  }, [isLoaded, isSignedIn]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkAuthBridge />
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/resume" component={ResumeHub} />
            <Route path="/resume/:id" component={ResumeEdit} />
            <Route path="/interview" component={InterviewHub} />
            <Route path="/interview/:id" component={InterviewRoom} />
            <Route path="/coding" component={CodingHub} />
            <Route path="/coding/:id" component={CodingIDE} />
            <Route path="/learning" component={LearningDashboard} />
            <Route path="/admin" component={AdminPanel} />
            <Route path="/profile" component={ProfilePage} />

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;