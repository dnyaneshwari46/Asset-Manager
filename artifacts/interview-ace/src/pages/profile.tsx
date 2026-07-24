import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  targetRole: z.string().min(2, "Role is required"),
  experienceLevel: z.string().min(1, "Experience level is required"),
});

export default function ProfilePage() {
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      targetRole: "",
      experienceLevel: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        targetRole: user.targetRole || "",
        experienceLevel: user.experienceLevel || "",
      });
    }
  }, [user, form]);

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateMe.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your preferences have been saved.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update profile.",
          variant: "destructive",
        });
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
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Profile & Preferences</h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </header>

        <div className="glass rounded-3xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Full Name</FormLabel>
                    <FormControl>
                      <Input className="bg-[#1e1e2d] border-white/10 text-white focus-visible:ring-blue-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="targetRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Target Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Frontend Developer" className="bg-[#1e1e2d] border-white/10 text-white focus-visible:ring-blue-500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-[#1e1e2d] border-white/10 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1e1e2d] border-white/10 text-white">
                          <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                          <SelectItem value="mid">Mid-level (3-5 years)</SelectItem>
                          <SelectItem value="senior">Senior (5+ years)</SelectItem>
                          <SelectItem value="lead">Lead / Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateMe.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/20"
                >
                  {updateMe.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </AppLayout>
  );
}