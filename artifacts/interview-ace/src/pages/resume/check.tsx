import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { customFetch, useCreateResume } from "@workspace/api-client-react";
import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Github,
  Linkedin,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

type LayoutSignals = {
  hasComplexLayout: boolean;
  reasons: string[];
};

type ParsedResume = {
  text: string;
  signals: LayoutSignals;
};

type Report = {
  score: number;
  issues: string[];
  strengths: string[];
  wordCount: number;
};

const ACCEPTED_TYPES = ".pdf,.docx,.txt";
const ACTION_VERBS = /\b(achieved|built|created|delivered|designed|developed|drove|improved|increased|launched|led|managed|optimized|reduced|resolved|scaled|shipped|streamlined)\b/i;
const KEYWORDS = /\b(java|javascript|typescript|react|python|node(?:\.js)?|sql|aws|azure|docker|kubernetes|git|html|css|machine learning|data structures|system design)\b/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]\d{4}\b/;
const LINKEDIN = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i;
const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i;

function scoreResume(text: string, signals: LayoutSignals): Report {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const words = normalized ? normalized.split(/\s+/).length : 0;
  let score = 0;
  const issues: string[] = [];
  const strengths: string[] = [];

  const contactScore = Number(EMAIL.test(normalized)) * 7 + Number(PHONE.test(normalized)) * 7 + Number(/\b(location|city|state|india|usa|uk|canada|new york|california)\b/i.test(normalized)) * 6;
  score += contactScore;
  if (contactScore === 20) strengths.push("Email, phone, and location are present.");
  else issues.push("Add a professional email, phone number, and location to make your contact details complete.");

  const sections = [
    { name: "Experience", pattern: /\b(experience|work history|employment)\b/i },
    { name: "Education", pattern: /\b(education|academic background|degree)\b/i },
    { name: "Skills", pattern: /\b(skills|technical skills|technologies)\b/i },
    { name: "Summary", pattern: /\b(summary|profile|objective|about me)\b/i },
  ];
  const sectionCount = sections.filter(({ pattern }) => pattern.test(normalized)).length;
  score += Math.round((sectionCount / 4) * 25);
  if (sectionCount === 4) strengths.push("Standard Summary, Experience, Education, and Skills sections are present.");
  else issues.push(`Add the missing standard sections: ${sections.filter(({ pattern }) => !pattern.test(normalized)).map(({ name }) => name).join(", ")}.`);

  if (!signals.hasComplexLayout) {
    score += 15;
    strengths.push("The document uses a simple, ATS-friendly layout.");
  } else {
    issues.push(`Simplify the layout for ATS parsing${signals.reasons.length ? `: ${signals.reasons.join(", ")}.` : "."} Avoid tables, images, graphics, and multi-column formatting.`);
  }

  if (words >= 300 && words <= 800) {
    score += 10;
    strengths.push(`Resume length is in the recommended range (${words} words).`);
  } else {
    issues.push(`Keep the resume between 300 and 800 words; this upload contains ${words} words.`);
  }

  if (ACTION_VERBS.test(lower) && KEYWORDS.test(lower)) {
    score += 15;
    strengths.push("Action verbs and relevant technical keywords were detected.");
  } else {
    issues.push(`Use measurable action verbs and role-relevant keywords${ACTION_VERBS.test(lower) ? " such as Java, React, Python, SQL, or AWS." : " (for example: built, led, improved, and delivered)."} `);
  }

  if (LINKEDIN.test(normalized) || GITHUB.test(normalized)) {
    score += 15;
    strengths.push("A LinkedIn or GitHub profile link is included.");
  } else {
    issues.push("Add a LinkedIn or GitHub profile link so recruiters can verify your professional work.");
  }

  return { score, issues, strengths, wordCount: words };
}

async function extractPdf(file: File): Promise<ParsedResume> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  const reasons: string[] = [];
  let hasImage = false;
  let hasColumns = false;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string; transform?: number[] }>;
    const xPositions = items.map((item) => item.transform?.[4]).filter((x): x is number => typeof x === "number");
    const uniqueColumns = new Set(xPositions.map((x) => Math.round(x / 40))).size;
    if (uniqueColumns > 12) hasColumns = true;
    pages.push(items.map((item) => item.str || "").join(" "));
    const operatorList = await page.getOperatorList();
    const imageOps = [pdfjsLib.OPS.paintImageMaskXObject, pdfjsLib.OPS.paintImageXObject, pdfjsLib.OPS.paintXObject];
    if (operatorList.fnArray.some((operator) => imageOps.includes(operator))) hasImage = true;
  }

  if (hasImage) reasons.push("images or graphics detected");
  if (hasColumns) reasons.push("multiple text columns detected");
  return { text: pages.join("\n\n"), signals: { hasComplexLayout: hasImage || hasColumns, reasons } };
}

async function extractFile(file: File): Promise<ParsedResume> {
  if (file.name.toLowerCase().endsWith(".pdf")) return extractPdf(file);
  if (file.name.toLowerCase().endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const reasons: string[] = [];
    if (/<table\b/i.test(htmlResult.value)) reasons.push("tables detected");
    if (/<img\b/i.test(htmlResult.value)) reasons.push("images or graphics detected");
    return { text: result.value, signals: { hasComplexLayout: reasons.length > 0, reasons } };
  }
  return { text: await file.text(), signals: { hasComplexLayout: false, reasons: [] } };
}

function extractBuilderContent(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(EMAIL)?.[0] || "";
  const phone = text.match(PHONE)?.[0] || "";
  const profileLine = lines.find((line) => !EMAIL.test(line) && !PHONE.test(line) && line.length > 2 && line.length < 70) || "";
  const sectionMatch = text.match(/(?:experience|work history|employment)\s*[:\-]?\s*([\s\S]*?)(?=\n\s*(?:education|skills|summary|projects?)\b|$)/i);
  const experienceText = sectionMatch?.[1]?.trim() || "";
  const experienceLines = experienceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    personalDetails: { name: profileLine, email, phone, location: "" },
    summary: text.match(/(?:summary|profile|objective)\s*[:\-]?\s*([\s\S]*?)(?=\n\s*(?:experience|education|skills|projects?)\b|$)/i)?.[1]?.trim() || "",
    experience: experienceText ? [{
      jobTitle: experienceLines[0] || "",
      company: experienceLines[1] || "",
      location: "",
      startDate: "",
      endDate: "",
      description: experienceLines.slice(2).join("\n"),
    }] : [],
    education: [],
    skills: [],
    projects: [],
  };
}

export default function UploadResumeCheck() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const createResume = useCreateResume();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      toast({ title: "Unsupported file type", description: "Upload a PDF, DOCX, or TXT file.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setReport(null);
    setText("");
    setIsParsing(true);
    try {
      const parsed = await extractFile(file);
      setText(parsed.text);
      setReport(scoreResume(parsed.text, parsed.signals));
    } catch (error) {
      toast({ title: "Could not parse this file", description: error instanceof Error ? error.message : "Please try another file.", variant: "destructive" });
      setFileName("");
    } finally {
      setIsParsing(false);
    }
  };

  const saveReport = async () => {
    if (!report || !text) return;
    setIsSaving(true);
    const savedAt = new Date().toISOString();
    const payload = { resumeName: fileName, extractedText: text, atsScore: report.score, issues: report.issues, savedAt };
    try {
      localStorage.setItem("interviewace-saved-ats-reports", JSON.stringify([
        ...JSON.parse(localStorage.getItem("interviewace-saved-ats-reports") || "[]"),
        payload,
      ]));
      await customFetch("/api/resume/save", { method: "POST", body: JSON.stringify(payload), responseType: "json" });
      toast({ title: "ATS report saved" });
      setLocation("/dashboard");
    } catch (error) {
      toast({ title: "Could not save report", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const importToBuilder = () => {
    if (!text) return;
    createResume.mutate({ data: { title: fileName.replace(/\.[^.]+$/, "") || "Imported Resume", template: "classic", content: extractBuilderContent(text) } }, {
      onSuccess: (resume) => setLocation(`/resume/${resume.id}`),
      onError: () => toast({ title: "Could not import resume", description: "Please try again.", variant: "destructive" }),
    });
  };

  const scoreColor = !report ? "bg-white/10" : report.score < 50 ? "bg-red-500" : report.score < 80 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/resume" className="mb-4 inline-flex items-center text-sm text-gray-400 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" /> Back to resumes</Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Upload Resume & Check ATS Score</h1>
            <p className="mt-2 text-gray-400">Get a free, local ATS-readiness report for your PDF, DOCX, or TXT resume.</p>
          </div>
          <Sparkles className="h-9 w-9 text-blue-400" />
        </header>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); void handleFile(event.dataTransfer.files[0]); }}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${isDragging ? "border-blue-400 bg-blue-500/10" : "border-white/15 bg-white/[0.03] hover:border-blue-500/50 hover:bg-blue-500/5"}`}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
          {isParsing ? <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-400" /> : <Upload className="mx-auto mb-4 h-10 w-10 text-blue-400" />}
          <h2 className="text-xl font-semibold text-white">{isParsing ? "Parsing your resume…" : fileName || "Drop your resume here"}</h2>
          <p className="mt-2 text-sm text-gray-400">{isParsing ? "Extracting text and checking ATS signals." : "or click to browse • PDF, DOCX, and TXT up to your browser’s file limit"}</p>
          {fileName && !isParsing && <p className="mt-4 inline-flex items-center rounded-lg bg-white/10 px-3 py-2 text-sm text-gray-200"><FileText className="mr-2 h-4 w-4 text-blue-300" /> {fileName}</p>}
        </div>

        {report && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm uppercase tracking-wider text-gray-400">ATS score</p><p className="mt-1 text-5xl font-bold text-white">{report.score}<span className="text-2xl text-gray-500">/100</span></p></div>
                <p className="text-sm text-gray-400">{report.wordCount} words</p>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-full transition-all ${scoreColor}`} style={{ width: `${report.score}%` }} /></div>
              <div className="mt-3 flex justify-between text-xs text-gray-500"><span>Needs work</span><span>Good</span><span>Strong</span></div>
              <div className="mt-8 space-y-3">
                {report.strengths.map((item) => <p key={item} className="flex gap-2 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {item}</p>)}
              </div>
            </div>
            <div className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white">Issues & suggestions</h2>
              <div className="mt-5 space-y-4">
                {report.issues.length ? report.issues.map((item) => <p key={item} className="flex gap-2 text-sm leading-relaxed text-amber-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> {item}</p>) : <p className="text-sm text-emerald-300">No issues found in the checks we ran.</p>}
              </div>
            </div>
          </section>
        )}

        {report && (
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={importToBuilder} disabled={createResume.isPending} className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
              {createResume.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Import to Builder
            </Button>
            <Button onClick={saveReport} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Save Report
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}