import { AppLayout } from "@/components/layout/AppLayout";
import { useGetLearningRoadmap } from "@workspace/api-client-react";
import { Loader2, PlayCircle, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LearningDashboard() {
  const { data: roadmap, isLoading } = useGetLearningRoadmap();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!roadmap) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
          <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Roadmap Generated</h2>
          <p className="text-gray-400">Take some interviews and coding challenges to generate your personalized learning roadmap.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Learning Roadmap</h1>
          <p className="text-gray-400">Personalized study plan based on your interview and coding performance.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-white">Focus Areas (Weaknesses)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {roadmap.weakTopics.map(topic => (
                <span key={topic} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-sm font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
          
          <div className="glass rounded-2xl p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-white">Strengths</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {roadmap.strongTopics.map(topic => (
                <span key={topic} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-sm font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Week-by-Week Plan
            </h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:to-transparent">
              {roadmap.plan.map((step, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={step.week} 
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-blue-500 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg shadow-blue-500/20 z-10">
                    {step.week}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-5 rounded-2xl">
                    <h3 className="font-bold text-white mb-1">{step.topic}</h3>
                    <p className="text-sm text-gray-400 mb-3">{step.goal}</p>
                    <div className="space-y-1">
                      {step.resources.map((res, j) => (
                        <div key={j} className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded inline-block mr-2">
                          {res}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-violet-400" />
              Recommended Videos
            </h2>
            <div className="space-y-4">
              {roadmap.recommendedVideos.map((video, i) => (
                <a 
                  key={i} 
                  href={video.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block glass p-4 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 mb-3 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                  <h4 className="font-medium text-white text-sm line-clamp-2 mb-1 group-hover:text-violet-300 transition-colors">{video.title}</h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{video.topic}</span>
                    <span>{video.duration}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}