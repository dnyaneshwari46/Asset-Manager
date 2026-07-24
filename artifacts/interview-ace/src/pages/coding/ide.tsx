import { AppLayout } from "@/components/layout/AppLayout";
import { useGetCodingProblem, getGetCodingProblemQueryKey, useSubmitCode } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Loader2, Play, CheckCircle2, XCircle, Code2, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CodingIDE() {
  const { id } = useParams();
  const problemId = parseInt(id || "0", 10);
  const { data: problem, isLoading } = useGetCodingProblem(problemId, { query: { enabled: !!problemId, queryKey: getGetCodingProblemQueryKey(problemId) } });
  const submitCode = useSubmitCode();
  const { toast } = useToast();

  const [language, setLanguage] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  // Initialize code when language changes or problem loads
  useEffect(() => {
    if (problem && !language && problem.languages.length > 0) {
      setLanguage(problem.languages[0]);
    }
  }, [problem, language]);

  useEffect(() => {
    if (problem && language && problem.starterCode) {
      setCode((problem.starterCode as Record<string, string>)[language] || "");
    }
  }, [problem, language]);

  const handleRun = () => {
    submitCode.mutate({ data: { problemId, language, code } }, {
      onSuccess: (res) => {
        setResult(res);
        toast({ 
          title: res.passed ? "Tests Passed!" : "Tests Failed",
          description: `Score: ${res.score}%`,
          variant: res.passed ? "default" : "destructive"
        });
      }
    });
  };

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    setResult(null); // Clear previous results
  };

  if (isLoading || !problem) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-14 glass-panel border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Code2 className="w-5 h-5 text-blue-400" />
          <h1 className="font-bold text-white tracking-tight">{problem.title}</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
            problem.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
            problem.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[120px] bg-[#1e1e2d] border-white/10 text-white h-8 text-xs">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e1e2d] border-white/10 text-white">
              {problem.languages.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRun} 
            disabled={submitCode.isPending}
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 font-medium rounded shadow-lg shadow-emerald-500/20"
          >
            {submitCode.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
            Run Tests
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Problem Description Panel */}
        <div className="w-[40%] min-w-[300px] border-r border-white/10 bg-[#0a0a1a] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-gray-300 prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: problem.description }} />
            
            {problem.examples && problem.examples.length > 0 && (
              <div className="mt-8 space-y-6">
                <h3 className="text-lg font-semibold text-white m-0">Examples</h3>
                {problem.examples.map((ex: any, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 font-mono text-sm border border-white/10">
                    <div className="mb-2"><strong className="text-gray-400">Input:</strong> {ex.input}</div>
                    <div className="mb-2"><strong className="text-gray-400">Output:</strong> {ex.output}</div>
                    {ex.explanation && <div><strong className="text-gray-400">Explanation:</strong> {ex.explanation}</div>}
                  </div>
                ))}
              </div>
            )}
            
            {problem.constraints && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white m-0">Constraints</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm font-mono text-gray-400">
                  {problem.constraints.split('\n').map((c, i) => c.trim() && <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Editor and Results Panel */}
        <div className="flex-1 flex flex-col bg-[#1e1e2d] relative">
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-[#1e1e2d] text-gray-300 font-mono text-sm p-4 outline-none resize-none border-none custom-scrollbar focus:ring-0 leading-relaxed"
              style={{ tabSize: 4 }}
            />
          </div>
          
          {/* Results Panel */}
          {result && (
            <div className="h-[250px] border-t border-white/10 bg-[#0f0f1d] flex flex-col shrink-0">
              <div className="h-10 bg-white/5 border-b border-white/10 px-4 flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Test Results
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex items-center gap-3 mb-4">
                  {result.passed ? (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-lg">Accepted</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                      <XCircle className="w-5 h-5" />
                      <span className="font-bold text-lg">Rejected</span>
                    </div>
                  )}
                  <div className="text-gray-400 text-sm">
                    {result.testsPassed} / {result.testsTotal} test cases passed. Score: {result.score}%
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-2 font-medium">
                      <AlertTriangle className="w-4 h-4" /> Complexity Analysis
                    </div>
                    <p className="text-sm text-gray-300">{result.complexity}</p>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2 font-medium">
                      <Lightbulb className="w-4 h-4" /> AI Suggestions
                    </div>
                    <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                      {result.suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}