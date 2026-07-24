// src/pages/resume/edit.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetResume, getGetResumeQueryKey, useUpdateResume, useAnalyzeResume } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Loader2, Download, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResumeEdit() {
  const { id } = useParams();
  const resumeId = parseInt(id || "0", 10);
  const { data: resume, isLoading } = useGetResume(resumeId, { query: { enabled: !!resumeId, queryKey: getGetResumeQueryKey(resumeId) } });
  const updateResume = useUpdateResume();
  const analyzeResume = useAnalyzeResume();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>({
    personalDetails: { name: "", email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [],
    skills: []
  });

  const initializedForId = useRef<number | null>(null);
  const lastSaved = useRef<any>(null);

  useEffect(() => {
    if (resume && initializedForId.current !== resumeId) {
      initializedForId.current = resumeId;
      setTitle(resume.title);
      const parsedContent = typeof resume.content === 'string' ? JSON.parse(resume.content) : (resume.content || content);
      setContent(parsedContent);
      lastSaved.current = { title: resume.title, content: parsedContent };
    }
  }, [resume, resumeId]);

  // Debounced auto-save could go here, but for explicit control we use a Save button for now
  const handleSave = () => {
    updateResume.mutate({ id: resumeId, data: { title, content } }, {
      onSuccess: () => {
        lastSaved.current = { title, content };
        toast({ title: "Saved successfully" });
      }
    });
  };

  const handleAnalyze = () => {
    analyzeResume.mutate({ id: resumeId }, {
      onSuccess: (res) => {
        toast({ 
          title: "Analysis Complete", 
          description: `ATS Score: ${res.score}%. Check suggestions.` 
        });
        // Might want to display res.recommendations somewhere
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Nav for Editor */}
      <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/resume">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-transparent hover:border-white/10 focus:border-blue-500 text-lg font-bold text-white px-2 h-10 w-[300px]"
          />
        </div>
        <div className="flex items-center gap-3">
          {resume?.atsScore !== null && resume?.atsScore !== undefined && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
              <span className="text-gray-400">ATS Score:</span>
              <span className={resume.atsScore > 80 ? "text-emerald-400" : "text-amber-400"}>{resume.atsScore}%</span>
            </div>
          )}
          <Button onClick={handleAnalyze} disabled={analyzeResume.isPending} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
            {analyzeResume.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analyze
          </Button>
          <Button onClick={handleSave} disabled={updateResume.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {updateResume.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
          <Button className="bg-white text-black hover:bg-gray-200">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Sidebar */}
        <div className="w-1/2 max-w-xl border-r border-white/10 bg-[#0a0a1a] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Full Name</label>
                <Input 
                  value={content?.personalDetails?.name || ''} 
                  onChange={(e) => setContent({...content, personalDetails: {...content.personalDetails, name: e.target.value}})}
                  className="bg-[#1e1e2d] border-white/5 text-white" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Email</label>
                <Input 
                  value={content?.personalDetails?.email || ''} 
                  onChange={(e) => setContent({...content, personalDetails: {...content.personalDetails, email: e.target.value}})}
                  className="bg-[#1e1e2d] border-white/5 text-white" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Phone</label>
                <Input 
                  value={content?.personalDetails?.phone || ''} 
                  onChange={(e) => setContent({...content, personalDetails: {...content.personalDetails, phone: e.target.value}})}
                  className="bg-[#1e1e2d] border-white/5 text-white" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Location</label>
                <Input 
                  value={content?.personalDetails?.location || ''} 
                  onChange={(e) => setContent({...content, personalDetails: {...content.personalDetails, location: e.target.value}})}
                  className="bg-[#1e1e2d] border-white/5 text-white" 
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Professional Summary</h2>
            <Textarea 
              value={content?.summary || ''}
              onChange={(e) => setContent({...content, summary: e.target.value})}
              className="bg-[#1e1e2d] border-white/5 text-white min-h-[120px] resize-y"
              placeholder="A brief overview of your professional background..."
            />
          </section>

          {/* We would map over experience here, but keeping it simple for now */}
          <section className="space-y-4 text-center p-8 border-2 border-dashed border-white/10 rounded-xl">
             <p className="text-gray-400 text-sm">Experience, Education & Skills sections are available in full version.</p>
          </section>

        </div>

        {/* Live Preview Panel */}
        <div className="flex-1 bg-[#1e1e2d] overflow-y-auto p-8 flex justify-center custom-scrollbar">
          <div className="w-[800px] min-h-[1056px] bg-white text-black shadow-2xl p-12 shrink-0">
            {/* Simple classic template rendering */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{content?.personalDetails?.name || 'Your Name'}</h1>
              <div className="flex justify-center items-center gap-3 text-sm text-gray-600">
                {content?.personalDetails?.email && <span>{content.personalDetails.email}</span>}
                {content?.personalDetails?.phone && <span>• {content.personalDetails.phone}</span>}
                {content?.personalDetails?.location && <span>• {content.personalDetails.location}</span>}
              </div>
            </div>

            {content?.summary && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wide">Summary</h2>
                <p className="text-sm leading-relaxed text-gray-800">{content.summary}</p>
              </div>
            )}
            
            {/* Empty placeholders for preview */}
            {!content?.summary && !content?.personalDetails?.name && (
              <div className="h-full flex items-center justify-center text-gray-300">
                Start typing on the left to see live preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}