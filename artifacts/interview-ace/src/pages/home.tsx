import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  FileText, 
  Mic, 
  Code2, 
  BookOpen, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden selection:bg-blue-500/30">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 glass border-x-0 border-t-0 border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Interview<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Ace</span></span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/sign-in">
            <span className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer">Log in</span>
          </Link>
          <Link href="/sign-up">
            <span className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors cursor-pointer shadow-lg shadow-white/10">
              Get Started
            </span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-blue-300 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Career Preparation</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight"
          >
            Land your dream job with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 animate-gradient">
              intelligent preparation
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            An immersive platform featuring an ATS-friendly resume builder, live AI voice interviews, technical coding arenas, and personalized learning roadmaps.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/sign-up">
              <span className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 cursor-pointer">
                Start Preparing Free
                <ArrowRight className="w-5 h-5" />
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-32">
          {[
            {
              icon: FileText,
              title: "Resume Builder",
              desc: "Create ATS-optimized resumes with live previews and intelligent scoring.",
              color: "text-blue-400"
            },
            {
              icon: Mic,
              title: "AI Voice Interviews",
              desc: "Immersive full-screen mock interviews with real-time speech recognition.",
              color: "text-violet-400"
            },
            {
              icon: Code2,
              title: "Coding Arena",
              desc: "Integrated IDE for solving data structures, algorithms, and system design.",
              color: "text-pink-400"
            },
            {
              icon: BookOpen,
              title: "Learning Roadmaps",
              desc: "Personalized study plans targeting your weakest skills based on performance.",
              color: "text-teal-400"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="glass p-8 rounded-3xl hover:bg-white/10 transition-colors group"
            >
              <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="mt-32 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">Questions sourced from top tech companies</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
            {/* Minimalist text representations of companies to avoid missing image assets */}
            {["Google", "Amazon", "Meta", "Apple", "Microsoft"].map(name => (
              <span key={name} className="text-2xl font-bold font-sans text-white">{name}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}