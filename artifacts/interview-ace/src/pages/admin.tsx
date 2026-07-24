import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminListUsers, useGetAdminAnalytics } from "@workspace/api-client-react";
import { Loader2, Users, FileText, Video, Code2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminPanel() {
  const { data: users, isLoading: usersLoading } = useAdminListUsers();
  const { data: analytics, isLoading: analyticsLoading } = useGetAdminAnalytics();

  if (usersLoading || analyticsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Fallback data if analytics userGrowth is empty or missing format
  const growthData = analytics?.userGrowth?.length ? analytics.userGrowth : [
    { name: 'Jan', users: 10 },
    { name: 'Feb', users: 25 },
    { name: 'Mar', users: 40 },
    { name: 'Apr', users: 80 },
    { name: 'May', users: 120 },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Platform overview and user management.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={analytics?.totalUsers || 0} icon={Users} color="text-blue-400" />
          <StatCard title="Total Interviews" value={analytics?.totalInterviews || 0} icon={Video} color="text-violet-400" />
          <StatCard title="Resumes Built" value={analytics?.totalResumes || 0} icon={FileText} color="text-pink-400" />
          <StatCard title="Code Submissions" value={analytics?.totalSubmissions || 0} icon={Code2} color="text-emerald-400" />
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">User Growth</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-0 overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Recent Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-gray-400 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {users?.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                    <td className="px-6 py-4 text-gray-400">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-violet-500/20 text-violet-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {user.interviewCount} interviews, {user.resumeCount} resumes
                    </td>
                  </tr>
                ))}
                {!users?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  return (
    <div className="glass rounded-2xl p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}