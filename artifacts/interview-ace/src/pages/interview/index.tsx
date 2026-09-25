import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListInterviews,
  useCreateInterview,
  useGetMe,
  useListResumes,
  useCreateResume,
  getListResumesQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Loader2, Mic, Play, Plus, Upload, Video } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { extractResumeText, buildResumeContent } from "@/lib/resume-parser";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  category: z.enum(['java', 'python', 'mern', 'fullstack', 'data_analyst', 'data_science', 'ai_ml', 'hr']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

export default function InterviewHub() {
  const { data: interviews, isLoading } = useListInterviews();
  const { data: profile } = useGetMe();
  const { data: resumes } = useListResumes();
  const createInterview = useCreateInterview();
  const createResume = useCreateResume();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isParsingResume, setIsParsingResume] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'fullstack',
      difficulty: 'intermediate',
    },
  });

  useEffect(() => {
    const targetRole = profile?.targetRole?.toLowerCase() || "";
    const inferredCategory =
      targetRole.includes("java") ? "java" :
      targetRole.includes("python") ? "python" :
      targetRole.includes("data analyst") ? "data_analyst" :
      targetRole.includes("data scientist") ? "data_science" :
      targetRole.includes("machine") || targetRole.includes("ai") ? "ai_ml" :
      targetRole.includes("frontend") || targetRole.includes("react") ? "mern" :
      targetRole.includes("backend") ? "fullstack" :
      targetRole.includes("hr") || targetRole.includes("human") ? "hr" :
      null;
    if (inferredCategory) form.setValue("category", inferredCategory);
  }, [profile?.targetRole, form]);

  useEffect(() => {
    if (!selectedResumeId && resumes?.length) {
      const latest = [...resumes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      setSelectedResumeId(String(latest.id));
    }
  }, [resumes, selectedResumeId]);

  const handleResumeUpload = async (file?: File) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      toast({ title: "Unsupported resume type", description: "Upload a PDF, DOCX, or TXT file.", variant: "destructive" });
      return;
    }

    setResumeFileName(file.name);
    setIsParsingResume(true);
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) throw new Error("No readable text was found in this resume.");
      const resume = await createResume.mutateAsync({
        data: {
          title: file.name.replace(/\.[^.]+$/, "") || "Interview Resume",
          template: "classic",
          content: buildResumeContent(text),
        },
      });
      queryClient.setQueryData(getListResumesQueryKey(), (existing: typeof resumes = []) => [
        resume,
        ...(existing || []).filter((item) => item.id !== resume.id),
      ]);
      setSelectedResumeId(String(resume.id));
      toast({ title: "Resume ready", description: "Your projects and skills will guide the interview questions." });
    } catch (error) {
      setResumeFileName("");
      toast({
        title: "Could not use this resume",
        description: error instanceof Error ? error.message : "Please upload another file.",
        variant: "destructive",
      });
    } finally {
      setIsParsingResume(false);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedResumeId) {
      toast({
        title: "Upload a resume first",
        description: "Upload a PDF, DOCX, or TXT resume so the interviewer can ask about your projects and skills.",
        variant: "destructive",
      });
      return;
    }
    createInterview.mutate({ data: { ...values, resumeId: Number(selectedResumeId) } }, {
      onSuccess: (session) => {
        setLocation(`/interview/${session.id}`);
      }
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const activeInterviews = interviews?.filter(i => i.status === 'in_progress' || i.status === 'active') || [];
  const pastInterviews = interviews?.filter(i => i.status === 'completed') || [];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Interview Hub</h1>
            <p className="text-gray-400">Practice live voice-based mock interviews with AI.</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Start New Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Configure Mock Interview</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Job Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#1e1e2d] border-white/10 text-white focus:ring-violet-500">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1e1e2d] border-white/10 text-white">
                          <SelectItem value="fullstack">Backend / Full Stack Engineer</SelectItem>
                          <SelectItem value="mern">Frontend / React Developer</SelectItem>
                            <SelectItem value="java">Java Developer</SelectItem>
                            <SelectItem value="python">Python Developer</SelectItem>
                            <SelectItem value="data_science">Data Scientist</SelectItem>
                            <SelectItem value="data_analyst">Data Analyst</SelectItem>
                            <SelectItem value="ai_ml">AI / ML Engineer</SelectItem>
                            <SelectItem value="hr">Behavioral / HR</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#1e1e2d] border-white/10 text-white focus:ring-violet-500">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1e1e2d] border-white/10 text-white">
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-violet-200">Resume for personalized questions</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        The interviewer will ask about projects, skills, and experience found in your resume.
                      </p>
                    </div>
                    {resumes?.length ? (
                      <select
                        value={selectedResumeId}
                        onChange={(event) => setSelectedResumeId(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#1e1e2d] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {resumes.map((resume) => (
                          <option key={resume.id} value={resume.id}>
                            {resume.title}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-3 text-sm text-gray-300 transition hover:border-violet-400/50 hover:bg-white/5">
                      {isParsingResume || createResume.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {resumeFileName || (resumes?.length ? "Upload a different resume" : "Upload your resume")}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        disabled={isParsingResume || createResume.isPending}
                        onChange={(event) => {
                          void handleResumeUpload(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {selectedResumeId && <p className="text-xs text-emerald-300">Resume selected for this interview.</p>}
                  </div>

                  <Button type="submit" disabled={createInterview.isPending || isParsingResume || createResume.isPending} className="w-full bg-violet-600 hover:bg-violet-700">
                    {createInterview.isPending || isParsingResume || createResume.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                    Enter Interview Room
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </header>

        {activeInterviews.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">In Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeInterviews.map(interview => (
                <Link key={interview.id} href={`/interview/${interview.id}`}>
                  <div className="glass rounded-2xl p-6 border-violet-500/30 hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
                        <h3 className="font-semibold text-white capitalize">{interview.category.replace('_', ' ')}</h3>
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{interview.difficulty}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Past Interviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastInterviews.map(interview => (
              <div key={interview.id} className="glass rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {Math.round(( (interview.technicalScore||0) + (interview.communicationScore||0) + (interview.confidenceScore||0) ) / 3)}%
                    </div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>
                </div>
                
                <h3 className="font-semibold text-white mb-1 capitalize">{interview.category.replace('_', ' ')}</h3>
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                  <span className="capitalize">{interview.difficulty}</span>
                  <span>•</span>
                  <span>{format(new Date(interview.createdAt), "MMM d, yyyy")}</span>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Technical</span>
                    <span className="text-white font-medium">{interview.technicalScore}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${interview.technicalScore}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-gray-400">Communication</span>
                    <span className="text-white font-medium">{interview.communicationScore}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${interview.communicationScore}%` }}></div>
                  </div>
                </div>
              </div>
            ))}

            {pastInterviews.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No completed interviews yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
