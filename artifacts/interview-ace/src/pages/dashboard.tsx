import { AppLayout } from "@/components/layout/AppLayout";
import { useGetDashboardStats, useGetDashboardActivity } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Target, Code2, MessageSquare, Briefcase } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();

  if (statsLoading || activityLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Mock data for charts if API doesn't provide exact shapes yet
  const radarData = [
    { subject: 'Resume', A: stats?.resumeScore || 0, fullMark: 100 },
    { subject: 'Technical', A: stats?.avgTechnicalScore || 0, fullMark: 100 },
    { subject: 'Communication', A: stats?.avgCommunicationScore || 0, fullMark: 100 },
    { subject: 'Coding', A: stats?.avgCodingScore || 0, fullMark: 100 },
    { subject: 'System Design', A: 65, fullMark: 100 },
  ];

  const progressData = [
    { name: 'Week 1', score: 40 },
    { name: 'Week 2', score: 55 },
    { name: 'Week 3', score: 68 },
    { name: 'Week 4', score: 75 },
    { name: 'Week 5', score: (stats?.avgTechnicalScore || 80) },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back!</h1>
            <p className="text-gray-400">Here's an overview of your interview readiness.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Resume Score" value={`${stats?.resumeScore || 0}%`} icon={Briefcase} color="text-blue-400" />
          <StatCard title="Interviews Taken" value={stats?.interviewCount || 0} icon={MessageSquare} color="text-violet-400" />
          <StatCard title="Coding Problems" value={stats?.totalSubmissions || 0} icon={Code2} color="text-pink-400" />
          <StatCard title="Avg Tech Score" value={`${Math.round(stats?.avgTechnicalScore || 0)}%`} icon={Target} color="text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-6">Readiness Progress</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Skill Analysis</h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Topics to Improve</h2>
            </div>
            {stats?.weakTopics && stats.weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.weakTopics.map(topic => (
                  <span key={topic} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-sm font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No weak topics identified yet. Keep practicing!</p>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {activity && activity.length > 0 ? activity.slice(0, 4).map((item, i) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{item.title}</p>
                    <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()} • {item.description}</p>
                  </div>
                  {item.score && (
                    <div className="ml-auto text-sm font-bold text-blue-400">
                      {item.score}%
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-gray-400 text-sm">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-6 flex items-center justify-between group"
    >
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </motion.div>
  );
}