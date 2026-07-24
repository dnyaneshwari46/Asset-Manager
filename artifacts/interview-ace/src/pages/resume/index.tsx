import { AppLayout } from "@/components/layout/AppLayout";
import { useListResumes, useCreateResume, useDeleteResume } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, FileText, Trash2, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListResumesQueryKey } from "@workspace/api-client-react";

export default function ResumeHub() {
  const { data: resumes, isLoading } = useListResumes();
  const createResume = useCreateResume();
  const deleteResume = useDeleteResume();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreate = () => {
    createResume.mutate({ data: { title: "Untitled Resume", template: "modern" } }, {
      onSuccess: (res) => {
        setLocation(`/resume/${res.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Could not create resume", variant: "destructive" });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if(confirm("Delete this resume?")) {
      deleteResume.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResumesQueryKey() });
          toast({ title: "Deleted" });
        }
      });
    }
  }

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
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Resume Builder</h1>
            <p className="text-gray-400">Create, analyze, and manage your ATS-friendly resumes.</p>
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={createResume.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
          >
            {createResume.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            New Resume
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes?.map(resume => (
            <Link key={resume.id} href={`/resume/${resume.id}`}>
              <div className="glass rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer group flex flex-col h-full relative">
                <button 
                  onClick={(e) => handleDelete(e, resume.id)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{resume.title}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300 capitalize">{resume.template} Template</span>
                  {resume.atsScore !== null && resume.atsScore !== undefined && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      resume.atsScore > 80 ? 'bg-emerald-500/20 text-emerald-300' :
                      resume.atsScore > 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      Score: {resume.atsScore}
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center text-sm text-gray-500">
                  <span>Updated {format(new Date(resume.updatedAt), "MMM d, yyyy")}</span>
                  <FileEdit className="w-4 h-4 group-hover:text-blue-400" />
                </div>
              </div>
            </Link>
          ))}
          
          {(!resumes || resumes.length === 0) && (
            <div 
              onClick={handleCreate}
              className="glass rounded-2xl p-6 border-dashed border-2 border-white/10 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-[240px]"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Create your first resume</h3>
              <p className="text-sm text-gray-400">Start building an ATS-optimized profile</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}