import { useGetInterview, getGetInterviewQueryKey, useSubmitAnswer } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Loader2, Mic, SquareSquare, MonitorUp, Send, CheckCircle2, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewRoom() {
  const { id } = useParams();
  const interviewId = parseInt(id || "0", 10);
  const { data: interview, isLoading } = useGetInterview(interviewId, { query: { enabled: !!interviewId, queryKey: getGetInterviewQueryKey(interviewId) } });
  const submitAnswer = useSubmitAnswer();
  const [, setLocation] = useLocation();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  
  const recognitionRef = useRef<any>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fallback mock questions since backend might not send them embedded yet
  const mockQuestions = [
    { id: 1, text: "Can you describe a time when you had to deal with a difficult team member?" },
    { id: 2, text: "How would you design the architecture for a scalable URL shortener service?" },
    { id: 3, text: "Explain the differences between REST and GraphQL. When would you use each?" }
  ];

  const currentQuestion = mockQuestions[currentQuestionIdx];

  const speakQuestion = (text: string) => {
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

  // Speak initial question on load
  useEffect(() => {
    if (currentQuestion && !evaluation) {
      const t = setTimeout(() => speakQuestion(currentQuestion.text), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [currentQuestionIdx, currentQuestion]);

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

  const handleSubmit = () => {
    if (!transcript.trim()) return;
    
    stopListening();
    
    submitAnswer.mutate({ 
      id: interviewId, 
      data: { questionId: currentQuestion.id, answer: transcript } 
    }, {
      onSuccess: (res) => {
        setEvaluation(res);
        // AI reads brief feedback
        speakQuestion(`Okay, I've noted your answer. ${res.feedback.substring(0, 100)}... Let's move on when you're ready.`);
      }
    });
  };

  const handleNext = () => {
    setEvaluation(null);
    setTranscript("");
    if (currentQuestionIdx < mockQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setLocation('/interview'); // Done
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Screen share failed", err);
    }
  };

  if (isLoading || !interview) {
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
            Q {currentQuestionIdx + 1} of {mockQuestions.length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={startScreenShare} variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-gray-300">
            <MonitorUp className="w-4 h-4 mr-2" />
            Share Screen
          </Button>
          <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => setLocation('/interview')}>
            End Interview
          </Button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative flex items-center justify-center p-8">
        {/* Background glow for AI speaking state */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isAiSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full"></div>
        </div>

        <div className="max-w-4xl w-full z-10 relative">
          <AnimatePresence mode="wait">
            {!evaluation ? (
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
                    {currentQuestion?.text}
                  </h2>
                </div>

                <div className="max-w-2xl mx-auto glass p-2 rounded-2xl flex items-center gap-2">
                  <button 
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
                    onClick={handleSubmit} 
                    disabled={submitAnswer.isPending || !transcript.trim()}
                    className="bg-blue-600 hover:bg-blue-700 h-14 px-8 rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    {submitAnswer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
                
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
                  <h3 className="text-2xl font-bold text-white">Answer Evaluated</h3>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <ScoreRing label="Technical" score={evaluation.technicalScore} color="stroke-blue-500" />
                  <ScoreRing label="Communication" score={evaluation.communicationScore} color="stroke-violet-500" />
                  <ScoreRing label="Confidence" score={evaluation.confidenceScore} color="stroke-emerald-500" />
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-2">AI Feedback</h4>
                    <p className="text-gray-200 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">{evaluation.feedback}</p>
                  </div>
                  
                  {evaluation.improvements && evaluation.improvements.length > 0 && (
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-amber-500/80 font-semibold mb-2">Areas for Improvement</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-300">
                        {evaluation.improvements.map((imp: string, i: number) => <li key={i}>{imp}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={handleNext} className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-12 text-lg">
                    Next Question <ChevronRight className="w-5 h-5 ml-2" />
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