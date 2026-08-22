// src/pages/resume/edit.tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetResume, getGetResumeQueryKey, useUpdateResume } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Loader2, Download, Sparkles, ChevronLeft, Plus, Trash2 } from "lucide-react";
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
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>({
    personalDetails: { name: "", email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
  });
  const [analysis, setAnalysis] = useState<{
    score: number;
    strengths: string[];
    suggestions: string[];
  } | null>(null);

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
    const summaryWords = String(content?.summary || "").trim().split(/\s+/).filter(Boolean);
    const experience = Array.isArray(content?.experience) ? content.experience : [];
    const education = Array.isArray(content?.education) ? content.education : [];
    const skills = Array.isArray(content?.skills) ? content.skills.filter(Boolean) : [];
    const bulletCount = experience.reduce((total: number, item: any) => {
      const bullets = String(item?.description || "").split(/\n|[•]/).map((line) => line.trim()).filter(Boolean);
      return total + bullets.length;
    }, 0);
    const searchableText = JSON.stringify(content).toLowerCase();
    const hasPlaceholder = /sdffghjk|lorem ipsum|your name|example\.com|test test/.test(searchableText);
    const hasEmptyFields = !content?.personalDetails?.name || experience.some((item: any) => !item?.jobTitle && !item?.title) || education.some((item: any) => !item?.degree && !item?.title);
    let score = 0;
    const strengths: string[] = [];
    const suggestions: string[] = [];
    if (summaryWords.length > 20) { score += 20; strengths.push("Professional summary has strong detail."); }
    else suggestions.push("Expand your summary to more than 20 words.");
    if (bulletCount >= 2) { score += 20; strengths.push("Experience includes multiple achievement bullets."); }
    else suggestions.push("Add at least two experience bullet points.");
    if (skills.length >= 5) { score += 20; strengths.push("Skills section has a useful range of keywords."); }
    else suggestions.push("Add at least five relevant skills.");
    if (!hasPlaceholder && !hasEmptyFields) { score += 20; strengths.push("Resume fields are complete and free of placeholder text."); }
    else suggestions.push("Complete empty fields and replace placeholder text.");
    if (education.length > 0 && education.some((item: any) => item?.degree || item?.title || item?.institution || item?.school)) { score += 20; strengths.push("Education details are included."); }
    else suggestions.push("Add your education details.");
    setAnalysis({ score, strengths, suggestions });
    setContent((previous: any) => ({ ...previous, atsScore: score }));
    toast({ title: "Free ATS analysis complete", description: `Your resume scored ${score}/100.` });
  };

  const updateSectionItem = (
    section: "experience" | "education",
    index: number,
    field: string,
    value: string,
  ) => {
    setContent((previous: any) => ({
      ...previous,
      [section]: (previous[section] || []).map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addSectionItem = (section: "experience" | "education") => {
    const item =
      section === "experience"
        ? { jobTitle: "", company: "", location: "", startDate: "", endDate: "", description: "" }
        : { degree: "", institution: "", location: "", graduationDate: "", description: "" };
    setContent((previous: any) => ({
      ...previous,
      [section]: [...(previous[section] || []), item],
    }));
  };

  const removeSectionItem = (section: "experience" | "education", index: number) => {
    setContent((previous: any) => ({
      ...previous,
      [section]: (previous[section] || []).filter((_: any, itemIndex: number) => itemIndex !== index),
    }));
  };

  const updateProject = (index: number, field: string, value: string) => {
    setContent((previous: any) => ({
      ...previous,
      projects: (previous.projects || []).map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addProject = () => {
    setContent((previous: any) => ({
      ...previous,
      projects: [...(previous.projects || []), { name: "", description: "", technologies: "", url: "" }],
    }));
  };

  const removeProject = (index: number) => {
    setContent((previous: any) => ({
      ...previous,
      projects: (previous.projects || []).filter((_: any, itemIndex: number) => itemIndex !== index),
    }));
  };

  const skillsText = Array.isArray(content?.skills)
    ? content.skills.map((skill: any) => (typeof skill === "string" ? skill : skill.name || "")).join(", ")
    : "";

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
          <Button onClick={handleAnalyze} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
            <Sparkles className="w-4 h-4 mr-2" />
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

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Experience</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => addSectionItem("experience")} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Plus className="w-4 h-4 mr-1" /> Add experience
              </Button>
            </div>
            {(content?.experience || []).map((item: any, index: number) => (
              <div key={index} className="relative space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <button type="button" onClick={() => removeSectionItem("experience", index)} aria-label="Remove experience" className="absolute right-3 top-3 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-3 pr-6">
                  <Input placeholder="Job title" value={item.jobTitle || item.title || ""} onChange={(e) => updateSectionItem("experience", index, "jobTitle", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Company" value={item.company || ""} onChange={(e) => updateSectionItem("experience", index, "company", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Location" value={item.location || ""} onChange={(e) => updateSectionItem("experience", index, "location", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Start date" value={item.startDate || ""} onChange={(e) => updateSectionItem("experience", index, "startDate", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                    <Input placeholder="End date" value={item.endDate || ""} onChange={(e) => updateSectionItem("experience", index, "endDate", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  </div>
                </div>
                <Textarea placeholder="Describe your responsibilities and achievements..." value={item.description || ""} onChange={(e) => updateSectionItem("experience", index, "description", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white min-h-[90px]" />
              </div>
            ))}
            {(!content?.experience || content.experience.length === 0) && <p className="text-sm text-gray-500">Add your most recent role and key achievements.</p>}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Education</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => addSectionItem("education")} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Plus className="w-4 h-4 mr-1" /> Add education
              </Button>
            </div>
            {(content?.education || []).map((item: any, index: number) => (
              <div key={index} className="relative space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <button type="button" onClick={() => removeSectionItem("education", index)} aria-label="Remove education" className="absolute right-3 top-3 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-3 pr-6">
                  <Input placeholder="Degree / qualification" value={item.degree || item.title || ""} onChange={(e) => updateSectionItem("education", index, "degree", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Institution" value={item.institution || item.school || ""} onChange={(e) => updateSectionItem("education", index, "institution", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Location" value={item.location || ""} onChange={(e) => updateSectionItem("education", index, "location", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Graduation date" value={item.graduationDate || item.endDate || ""} onChange={(e) => updateSectionItem("education", index, "graduationDate", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                </div>
                <Textarea placeholder="Relevant coursework, honors, or achievements..." value={item.description || ""} onChange={(e) => updateSectionItem("education", index, "description", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white min-h-[70px]" />
              </div>
            ))}
            {(!content?.education || content.education.length === 0) && <p className="text-sm text-gray-500">Add your degree, institution, and graduation details.</p>}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Skills</h2>
            <Textarea
              value={skillsText}
              onChange={(e) => setContent({ ...content, skills: e.target.value.split(",").map((skill) => skill.trim()).filter(Boolean) })}
              placeholder="JavaScript, React, Node.js, SQL, Python"
              className="bg-[#1e1e2d] border-white/5 text-white min-h-[90px]"
            />
            <p className="text-xs text-gray-500">Separate skills with commas.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Projects</h2>
              <Button type="button" size="sm" variant="outline" onClick={addProject} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Plus className="w-4 h-4 mr-1" /> Add project
              </Button>
            </div>
            {(content?.projects || []).map((item: any, index: number) => (
              <div key={index} className="relative space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <button type="button" onClick={() => removeProject(index)} aria-label="Remove project" className="absolute right-3 top-3 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-3 pr-6">
                  <Input placeholder="Project name" value={item.name || item.title || ""} onChange={(e) => updateProject(index, "name", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                  <Input placeholder="Technologies used" value={Array.isArray(item.technologies) ? item.technologies.join(", ") : item.technologies || ""} onChange={(e) => updateProject(index, "technologies", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                </div>
                <Input placeholder="Project URL (optional)" value={item.url || ""} onChange={(e) => updateProject(index, "url", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white" />
                <Textarea placeholder="Describe what you built and the impact..." value={item.description || ""} onChange={(e) => updateProject(index, "description", e.target.value)} className="bg-[#1e1e2d] border-white/5 text-white min-h-[90px]" />
              </div>
            ))}
            {(!content?.projects || content.projects.length === 0) && <p className="text-sm text-gray-500">Add projects that demonstrate your skills and impact.</p>}
          </section>

          {analysis && (
            <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Free ATS Analysis</h2>
                <span className="text-2xl font-bold text-blue-400">{analysis.score}/100</span>
              </div>
              {analysis.strengths.map((item) => <p key={item} className="text-sm text-emerald-300">✓ {item}</p>)}
              {analysis.suggestions.map((item) => <p key={item} className="text-sm text-amber-300">• {item}</p>)}
            </section>
          )}

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
            
            {(content?.experience || []).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wide">Experience</h2>
                <div className="space-y-4">
                  {content.experience.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="flex justify-between gap-4">
                        <div>
                          <h3 className="font-bold">{item.jobTitle || item.title || "Position"}</h3>
                          <p className="text-sm text-gray-700">{item.company}{item.location ? ` • ${item.location}` : ""}</p>
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">{item.startDate}{item.startDate && item.endDate ? " – " : ""}{item.endDate}</span>
                      </div>
                      {item.description && <p className="text-sm leading-relaxed text-gray-800 mt-1 whitespace-pre-line">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(content?.education || []).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wide">Education</h2>
                <div className="space-y-3">
                  {content.education.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{item.degree || item.title || "Degree"}</h3>
                        <p className="text-sm text-gray-700">{item.institution || item.school}{item.location ? ` • ${item.location}` : ""}</p>
                        {item.description && <p className="text-sm text-gray-800 mt-1">{item.description}</p>}
                      </div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">{item.graduationDate || item.endDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(content?.skills || []).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wide">Skills</h2>
                <p className="text-sm leading-relaxed text-gray-800">{skillsText}</p>
              </div>
            )}

            {(content?.projects || []).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3 uppercase tracking-wide">Projects</h2>
                <div className="space-y-3">
                  {content.projects.map((item: any, index: number) => (
                    <div key={index}>
                      <div className="flex justify-between gap-4">
                        <h3 className="font-bold">{item.name || item.title || "Project"}</h3>
                        {item.url && <span className="text-sm text-blue-700">{item.url}</span>}
                      </div>
                      {item.technologies && <p className="text-sm text-gray-700">{Array.isArray(item.technologies) ? item.technologies.join(", ") : item.technologies}</p>}
                      {item.description && <p className="text-sm leading-relaxed text-gray-800 mt-1 whitespace-pre-line">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!content?.summary && !content?.personalDetails?.name && !(content?.experience || []).length && !(content?.education || []).length && !(content?.skills || []).length && !(content?.projects || []).length && (
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