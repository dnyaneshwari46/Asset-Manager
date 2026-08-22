import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  LayoutDashboard, 
  FileText, 
  Mic, 
  Code2, 
  BookOpen, 
  ShieldCheck, 
  User, 
  LogOut,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "Resume", href: "/resume" },
  { icon: Mic, label: "Interview", href: "/interview" },
  { icon: Code2, label: "Coding", href: "/coding" },
  { icon: BookOpen, label: "Learning", href: "/learning" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-6 px-4 md:px-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin"; // Approximate admin check based on clerk data if any
  // If we rely on api backend for role, we might not have it in layout synchronously,
  // but let's assume we show admin if the path is admin or just show it if they navigate there.
  // For the sake of UI completeness, we will always show it or fetch profile.
  
  const navItems = NAV_ITEMS;

  return (
    <div className="w-64 glass-panel border-r border-y-0 border-l-0 hidden md:flex flex-col z-20">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Interview<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Ace</span></span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group relative",
                isActive ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
              )}>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-blue-400" : "group-hover:text-blue-400 transition-colors")} />
                <span className="font-medium relative z-10">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <div className="pt-8 pb-2">
          <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</div>
        </div>

        <Link href="/profile">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group relative",
            location === "/profile" ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
          )}>
            <User className="w-5 h-5 group-hover:text-violet-400 transition-colors" />
            <span className="font-medium">Profile</span>
          </div>
        </Link>

        <Link href="/admin">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group relative",
            location === "/admin" ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
          )}>
            <ShieldCheck className="w-5 h-5 group-hover:text-violet-400 transition-colors" />
            <span className="font-medium">Admin</span>
          </div>
        </Link>
      </nav>

      <div className="p-4 mt-auto">
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <img src={user?.imageUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-white/20" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.fullName || "User"}</div>
            <div className="text-xs text-gray-400 truncate">{user?.primaryEmailAddress?.emailAddress}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopNav() {
  const { signOut } = useClerk();
  
  return (
    <header className="h-16 glass-panel border-b border-x-0 border-t-0 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4 md:hidden">
        <Sparkles className="w-6 h-6 text-blue-400" />
        <span className="font-bold text-lg">InterviewAce</span>
      </div>
      <div className="hidden md:block"></div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-panel border-t border-white/10 flex items-center justify-around px-2 py-2 safe-area-pb">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all cursor-pointer",
              isActive ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute bottom-0 w-8 h-0.5 bg-blue-400 rounded-full"
                />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}