import { AppLayout } from "@/components/layout/AppLayout";
import { useListCodingProblems } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Loader2, Code2, Clock, CheckCircle2 } from "lucide-react";

export default function CodingHub() {
  const { data: problems, isLoading } = useListCodingProblems({});

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const difficultyColors = {
    easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    hard: "text-red-400 bg-red-500/10 border-red-500/20"
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Coding Arena</h1>
            <p className="text-gray-400">Practice data structures, algorithms, and system design problems.</p>
          </div>
        </header>

        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Difficulty</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Languages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {problems?.map(problem => (
                  <tr key={problem.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      {/* Assuming unattempted for now since backend doesn't return user status per problem in list */}
                      <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center"></div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/coding/${problem.id}`}>
                        <span className="font-medium text-white hover:text-blue-400 transition-colors cursor-pointer block">
                          {problem.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${difficultyColors[problem.difficulty as keyof typeof difficultyColors] || 'bg-gray-500/10 text-gray-300'}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex gap-2">
                        {problem.languages.map(lang => (
                          <span key={lang} className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!problems?.length && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No coding problems found.</p>
                    </td>
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