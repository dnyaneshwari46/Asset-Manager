import {
  useGetInterview,
  getGetInterviewQueryKey,
  useSubmitAnswer,
  useListQuestions,
  getListQuestionsQueryKey,
  useListResumes,
  useAbandonInterview,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, Loader2, Mic, SquareSquare, MonitorUp, Send, CheckCircle2, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type InterviewQuestion = {
  id: number;
  category: string;
  difficulty: string;
  text: string;
  type: string;
  sampleAnswer?: string | null;
  tags?: string[];
};

type QuestionKind = "technical" | "scenario" | "behavioral";

const QUESTION_PLAN: QuestionKind[] = [
  "behavioral",
  ...Array<QuestionKind>(5).fill("technical"),
  ...Array<QuestionKind>(5).fill("scenario"),
  ...Array<QuestionKind>(4).fill("behavioral"),
];

const ROLE_LABELS: Record<string, string> = {
  java: "Java Developer",
  python: "Python Developer",
  mern: "Frontend / React Developer",
  fullstack: "Backend / Full Stack Engineer",
  data_analyst: "Data Analyst",
  data_science: "Data Scientist",
  ai_ml: "AI / ML Engineer",
  hr: "Behavioral / HR",
};

function questionKind(question: InterviewQuestion): QuestionKind {
  const haystack = `${question.type} ${(question.tags || []).join(" ")} ${question.text}`.toLowerCase();
  if (question.type.toLowerCase() === "scenario") return "scenario";
  if (question.type.toLowerCase() === "behavioral" || question.type.toLowerCase() === "hr") return "behavioral";
  if (
    haystack.includes("behavior") ||
    haystack.includes("hr") ||
    haystack.includes("tell me about") ||
    haystack.includes("strength") ||
    haystack.includes("team")
  ) {
    return "behavioral";
  }
  if (
    haystack.includes("scenario") ||
    haystack.includes("situat") ||
    haystack.includes("suppose") ||
    haystack.includes("what would you do") ||
    haystack.includes("how would you handle")
  ) {
    return "scenario";
  }
  return "technical";
}

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function chooseNextQuestion(
  bank: InterviewQuestion[],
  asked: InterviewQuestion[],
  answeredQuestionIds: number[],
  previousQuestion: InterviewQuestion | undefined,
  previousAnswer: string,
  questionNumber: number,
) {
  const askedIds = new Set(asked.map((question) => question.id));
  const answeredIds = new Set(answeredQuestionIds);
  const candidates = bank.filter((question) => !askedIds.has(question.id) && !answeredIds.has(question.id));
  if (!candidates.length) return undefined;

  const targetKind = QUESTION_PLAN[questionNumber] || "behavioral";
  const answerTokens = tokens(previousAnswer);
  const previousTokens = tokens(previousQuestion?.text || "");
  const targetCandidates = candidates.filter((question) => questionKind(question) === targetKind);
  const pool = targetCandidates.length ? targetCandidates : candidates;

  return [...pool].sort((a, b) => {
    const score = (question: InterviewQuestion) => {
      const questionTokens = tokens(`${question.text} ${(question.tags || []).join(" ")}`);
      let relevance = questionKind(question) === targetKind ? 8 : 0;
      questionTokens.forEach((token) => {
        if (answerTokens.has(token)) relevance += 4;
        if (previousTokens.has(token)) relevance += 1;
      });
      return relevance;
    };
    return score(b) - score(a);
  })[0];
}

function getResumeQuestionText(
  question: InterviewQuestion,
  resume: { content?: Record<string, unknown> } | undefined,
  questionNumber: number,
) {
  if (!resume) return question.text;

  const content = (resume.content || {}) as Record<string, any>;
  const projects = Array.isArray(content.projects) ? content.projects : [];
  const experience = Array.isArray(content.experience) ? content.experience : [];
  const project = projects.find((item) => String(item?.name || item?.title || "").trim());
  const projectName = String(project?.name || project?.title || "").trim();
  const experienceItem = experience.find((item) => String(item?.jobTitle || item?.title || "").trim());
  const jobTitle = String(experienceItem?.jobTitle || experienceItem?.title || "").trim();
  const company = String(experienceItem?.company || "").trim();
  const extractedText = String(content.extractedText || "").trim();

  if (questionNumber === 0) {
    if (projectName) {
      return `Tell me about ${projectName} from your resume. What problem did it solve, what did you personally build, and what result did you achieve?`;
    }
    if (jobTitle) {
      return `Tell me about your experience as a ${jobTitle}${company ? ` at ${company}` : ""}. What did you personally own and what did you learn?`;
    }
    if (extractedText) {
      return "Tell me about yourself using your resume as a guide. Which project or experience best shows that you are ready for this role?";
    }
    return "Tell me about yourself and the project or experience that best prepares you for this role.";
  }

  if (questionKind(question) === "behavioral" && projectName) {
    return `For ${projectName} on your resume, what was the hardest decision or problem you faced, and how did you handle it?`;
  }

  return question.text;
}

export default function InterviewRoom() {
  const { id } = useParams();
  const interviewId = parseInt(id || "0", 10);
  const { data: interview, isLoading } = useGetInterview(interviewId, { query: { enabled: !!interviewId, queryKey: getGetInterviewQueryKey(interviewId) } });
  const { data: resumes } = useListResumes();
  const submitAnswer = useSubmitAnswer();
  const abandonInterview = useAbandonInterview();
  const { data: questions, isLoading: questionsLoading } = useListQuestions(
    interview ? { category: interview.category, difficulty: interview.difficulty, limit: 50 } : undefined,
    { query: { enabled: !!interview, queryKey: getListQuestionsQueryKey(interview ? { category: interview.category, difficulty: interview.difficulty, limit: 50 } : undefined) } },
  );
  const [, setLocation] = useLocation();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questionSequence, setQuestionSequence] = useState<InterviewQuestion[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [screenShareStatus, setScreenShareStatus] = useState<"idle" | "shared" | "declined">("idle");
  const [screenShareError, setScreenShareError] = useState("");
  const [tabExitNotice, setTabExitNotice] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenQuestionRef = useRef("");
  const lastAnswerRef = useRef("");
  const tabExitHandledRef = useRef(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const questionBank = useMemo<InterviewQuestion[]>(() => {
    if (!questions?.length) return [];
    const unique = Array.from(new Map(questions.map((question) => [question.text.trim(), question])).values());
    return unique as InterviewQuestion[];
  }, [questions]);

  const latestResume = useMemo(() => {
    if (!resumes?.length) return undefined;
    return [...resumes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [resumes]);

  useEffect(() => {
    setCurrentQuestionIdx(0);
    setQuestionSequence([]);
    setAnsweredQuestionIds([]);
    setTranscript("");
    setEvaluation(null);
    lastAnswerRef.current = "";
    lastSpokenQuestionRef.current = "";
  }, [interviewId]);

  useEffect(() => {
    if (!questionBank.length || questionSequence.length) return;
    const serverAnsweredIds = interview?.answeredQuestionIds || [];
    const firstQuestion = chooseNextQuestion(questionBank, [], serverAnsweredIds, undefined, "", 0);
    if (firstQuestion) setQuestionSequence([firstQuestion]);
    if (serverAnsweredIds.length) setAnsweredQuestionIds(serverAnsweredIds);
  }, [questionBank, questionSequence.length, interview?.answeredQuestionIds]);

  const currentQuestion = questionSequence[currentQuestionIdx];
  const displayedQuestionText = currentQuestion
    ? getResumeQuestionText(currentQuestion, latestResume, currentQuestionIdx)
    : "";

  const terminateInterview = useCallback((message: string) => {
    if (tabExitHandledRef.current) return;
    tabExitHandledRef.current = true;
    recognitionRef.current?.stop?.();
    window.speechSynthesis.cancel();
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsRecording(false);
    setIsInterviewStarted(false);
    setTabExitNotice(message);
    abandonInterview.mutate({ id: interviewId }, {
      onSettled: () => {
        window.setTimeout(() => setLocation("/interview"), 1800);
      },
    });
  }, [abandonInterview, interviewId, setLocation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isInterviewStarted) {
        terminateInterview("This interview was closed because you left the interview tab. Open a new interview when you are ready to try again.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isInterviewStarted, terminateInterview]);

  const speakQuestion = (text: string) => {
    const questionKey = text.trim().slice(0, 10).toLowerCase();
    if (!questionKey || questionKey === lastSpokenQuestionRef.current) return;
    lastSpokenQuestionRef.current = questionKey;
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US');
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset);
    };
    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

  // Speak each question once. Keeping the dependency on the index prevents
  // every transcript/evaluation render from starting the same utterance again.
  useEffect(() => {
    if (currentQuestion && !evaluation && isInterviewStarted) {
      const t = setTimeout(() => speakQuestion(displayedQuestionText), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [currentQuestionIdx, currentQuestion?.id, displayedQuestionText, evaluation, isInterviewStarted]);

  useEffect(() => () => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop?.();
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use text input.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const current = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      window.speechSynthesis.cancel(); // Interrupt AI if speaking
      setIsAiSpeaking(false);
      startListening();
    }
  };

  const moveToNextQuestion = (extraAnsweredQuestionIds: number[] = answeredQuestionIds) => {
    const nextQuestion = chooseNextQuestion(
      questionBank,
      questionSequence,
      extraAnsweredQuestionIds,
      currentQuestion,
      lastAnswerRef.current,
      currentQuestionIdx + 1,
    );
    setEvaluation(null);
    setTranscript("");
    lastAnswerRef.current = "";
    if (nextQuestion && currentQuestionIdx < QUESTION_PLAN.length - 1) {
      setQuestionSequence((previous) => [...previous, nextQuestion]);
      setCurrentQuestionIdx((previous) => previous + 1);
    } else {
      setLocation("/interview");
    }
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!isInterviewStarted || !transcript.trim() || !currentQuestion || submitAnswer.isPending) return;
    
    stopListening();
    lastAnswerRef.current = transcript.trim();
    
    submitAnswer.mutate({
      id: interviewId, 
      data: { questionId: currentQuestion.id, questionText: displayedQuestionText, answer: transcript.trim() }
    }, {
      onSuccess: (res) => {
        setTranscript("");
        setEvaluation(res);
        setAnsweredQuestionIds((previous) => previous.includes(currentQuestion.id)
          ? previous
          : [...previous, currentQuestion.id]);
        // AI reads brief feedback
        speakQuestion(`Okay, I've noted your answer. ${res.feedback.substring(0, 100)}... Let's move on when you're ready.`);
      },
      onError: (error) => {
        const status = (error as { status?: number }).status;
        if ((status === 404 || status === 409) && currentQuestion) {
          const updatedAnsweredIds = status === 409 && !answeredQuestionIds.includes(currentQuestion.id)
            ? [...answeredQuestionIds, currentQuestion.id]
            : answeredQuestionIds;
          setAnsweredQuestionIds(updatedAnsweredIds);
          submitAnswer.reset();
          moveToNextQuestion(updatedAnsweredIds);
        }
      },
    });
  };

  const handleNext = () => {
    moveToNextQuestion();
  };

  const requestScreenShare = async () => {
    setScreenShareError("");
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0]?.addEventListener("ended", () => setScreenShareStatus("declined"));
      setScreenShareStatus("shared");
      return true;
    } catch (err) {
      setScreenShareStatus("declined");
      setScreenShareError(err instanceof Error ? err.message : "Screen sharing was not enabled.");
      return false;
    }
  };

  const startInterview = async (withScreenShare: boolean) => {
    if (withScreenShare) await requestScreenShare();
    setIsInterviewStarted(true);
  };

  const handleEndInterview = () => {
    if (!window.confirm("End this interview? Your completed answers will be kept, but the session will close.")) return;
    abandonInterview.mutate({ id: interviewId }, {
      onSettled: () => setLocation("/interview"),
    });
  };

  if (tabExitNotice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05050a] px-6 text-white">
        <div className="glass max-w-lg rounded-3xl p-10 text-center">
          <AlertTriangle className="mx-auto mb-5 h-12 w-12 text-amber-300" />
          <h1 className="text-2xl font-semibold">Interview closed</h1>
          <p className="mt-4 leading-relaxed text-gray-300">{tabExitNotice}</p>
          <p className="mt-5 text-sm text-gray-500">Returning to the interview hub…</p>
        </div>
      </div>
    );
  }

  if (isLoading || !interview || questionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#05050a] text-white overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0 z-20 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isAiSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="font-medium text-gray-300">AI Interviewer</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400">
             Q {currentQuestionIdx + 1} of {Math.min(QUESTION_PLAN.length, interview.questionsAsked || QUESTION_PLAN.length)}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => void requestScreenShare()} variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-gray-300">
            <MonitorUp className="w-4 h-4 mr-2" />
            Share Screen
          </Button>
          <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleEndInterview}>
            End Interview
          </Button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative flex items-center justify-center p-8 pb-28 md:pb-8">
        {/* Background glow for AI speaking state */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isAiSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full"></div>
        </div>

        <div className="max-w-4xl w-full z-10 relative">
          <AnimatePresence mode="wait">
            {!isInterviewStarted ? (
              <motion.div
                key="preflight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl p-8 md:p-12 max-w-2xl mx-auto text-center"
              >
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] mb-6">
                  <MonitorUp className="w-9 h-9 text-white" />
                </div>
                <p className="text-sm uppercase tracking-[0.2em] text-violet-300">AI interviewer ready</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-semibold text-white">
                  Let’s practice your {ROLE_LABELS[interview.category] || interview.category} interview
                </h2>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  I’ll ask practical, fresher-friendly questions inspired by real mock-interview patterns,
                  follow up on what you say, and use screen sharing when you explain a project or code.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                  <Button onClick={() => void startInterview(true)} className="bg-violet-600 hover:bg-violet-700 h-12 px-6">
                    <MonitorUp className="w-4 h-4 mr-2" /> Start with screen share
                  </Button>
                  <Button onClick={() => void startInterview(false)} variant="outline" className="border-white/15 text-gray-300 h-12 px-6">
                    Continue without sharing
                  </Button>
                </div>
                {screenShareError && <p className="mt-4 text-sm text-amber-300">{screenShareError} You can continue without sharing.</p>}
              </motion.div>
            ) : !evaluation ? (
              <motion.div 
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                  <div className="mb-12">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] mb-8 relative">
                    <User className="w-10 h-10 text-white" />
                    {isAiSpeaking && (
                      <div className="absolute inset-0 rounded-full border-2 border-violet-400 animate-ping"></div>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-semibold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                     {displayedQuestionText || "No questions are available for this role yet."}
                  </h2>
                   <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
                     <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                       {ROLE_LABELS[interview.category] || interview.category}
                     </span>
                     <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                       {currentQuestion ? `${questionKind(currentQuestion)} follow-up` : "Preparing question"}
                     </span>
                     {screenShareStatus === "shared" && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">Screen shared</span>}
                   </div>
                </div>

                <form ref={composerRef} onSubmit={handleSubmit} style={{ bottom: keyboardOffset }} className="fixed left-0 right-0 z-30 mx-auto max-w-2xl glass p-2 rounded-t-2xl md:static md:rounded-2xl flex items-center gap-2 border border-white/10 bg-[#0f0f1d]/95 backdrop-blur-xl md:bottom-auto">
                  <button 
                    type="button"
                    onClick={toggleRecording}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                      isRecording ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {isRecording ? <SquareSquare className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <input 
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Speak or type your answer here..."
                    className="flex-1 bg-transparent border-none outline-none px-4 text-lg text-white placeholder:text-gray-500"
                  />
                  <Button 
                    type="submit"
                     disabled={submitAnswer.isPending || !transcript.trim() || !currentQuestion}
                    className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    {submitAnswer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </form>
                 {submitAnswer.isError && (
                   <p className="mt-3 text-sm text-red-300">
                     {submitAnswer.error instanceof Error ? submitAnswer.error.message : "Your answer could not be submitted. Please try again."}
                   </p>
                 )}
                
                {isRecording && (
                  <div className="mt-6 flex justify-center gap-1 h-8 items-end">
                    {[...Array(20)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: ['20%', '100%', '20%'] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.05 }}
                        className="w-1.5 bg-violet-500 rounded-t-full"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="evaluation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-3xl p-8 max-w-3xl mx-auto text-left"
              >
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">Interviewer feedback</h3>
                    <p className="text-sm text-gray-400 mt-1">Specific notes on this answer before we continue.</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <ScoreRing label="Technical" score={evaluation.technicalScore} color="stroke-blue-500" />
                  <ScoreRing label="Communication" score={evaluation.communicationScore} color="stroke-violet-500" />
                  <ScoreRing label="Confidence" score={evaluation.confidenceScore} color="stroke-emerald-500" />
                </div>

                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                      <h4 className="text-sm uppercase tracking-wider text-emerald-300 font-semibold mb-2">What I heard</h4>
                      <p className="text-gray-200 leading-relaxed">{evaluation.feedback}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4">
                      <h4 className="text-sm uppercase tracking-wider text-violet-300 font-semibold mb-2">What a strong answer covers</h4>
                      <p className="text-gray-200 leading-relaxed">{evaluation.correctAnswer}</p>
                    </div>
                  </div>
                  
                  {evaluation.improvements && evaluation.improvements.length > 0 && (
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-amber-300 font-semibold mb-2">Your next improvement</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-300">
                        {evaluation.improvements.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={handleNext} className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-12 text-lg">
                      {currentQuestionIdx === QUESTION_PLAN.length - 1 ? "Finish Interview" : "Next Question"} <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PIP Screen Share */}
        <video 
          ref={screenVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute bottom-8 right-8 w-64 aspect-video bg-black rounded-xl border border-white/20 shadow-2xl object-cover pointer-events-none empty:hidden" 
        />
      </main>
    </div>
  );
}

function ScoreRing({ score, label, color }: { score: number, label: string, color: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 flex items-center justify-center mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r={radius} className="stroke-white/10" strokeWidth="6" fill="none" />
          <motion.circle 
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="40" cy="40" r={radius} 
            className={color} 
            strokeWidth="6" 
            fill="none" 
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-lg font-bold text-white">{score}%</span>
      </div>
      <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}