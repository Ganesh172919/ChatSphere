import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderKanban, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { queryClient } from "@/app/query-client";
import {
  createProjectApi,
  deleteProjectApi,
  getProjectApi,
  listProjectsApi,
  updateProjectApi,
} from "@/shared/api/projects";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { Textarea } from "@/shared/ui/Textarea";
import { WorkspaceScaffold } from "@/shared/ui/WorkspaceScaffold";
import { formatRelativeTime } from "@/shared/utils/format";

const projectSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(120, "Max 120 characters"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  context: z.string().optional(),
  tags: z.string().optional(),
  suggestedPrompts: z.string().optional(),
});

type ProjectSchema = z.infer<typeof projectSchema>;

const ProjectsPageImpl = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const form = useForm<ProjectSchema>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      context: "",
      tags: "",
      suggestedPrompts: "",
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjectsApi,
  });
  const projectQuery = useQuery({
    queryKey: projectId ? ["project", projectId] : ["project", "empty"],
    queryFn: () => getProjectApi(projectId!),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    if (!projectQuery.data) {
      return;
    }

    form.reset({
      name: projectQuery.data.name,
      description: projectQuery.data.description ?? "",
      instructions: projectQuery.data.instructions ?? "",
      context: projectQuery.data.context ?? "",
      tags: projectQuery.data.tags.join(", "),
      suggestedPrompts: projectQuery.data.suggestedPrompts.join("\n"),
    });
  }, [form, projectQuery.data]);

  const filteredProjects = useMemo(() => {
    return (projectsQuery.data ?? []).filter((project) =>
      `${project.name} ${project.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [projectsQuery.data, search]);

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/app/projects/${project.id}`);
    },
  });
  const saveMutation = useMutation({
    mutationFn: (values: ProjectSchema) => {
      if (!projectId) {
        return createProjectApi({
          name: values.name,
          description: values.description,
          instructions: values.instructions,
          context: values.context,
          tags: values.tags?.split(",").map((tag) => tag.trim()).filter(Boolean),
          suggestedPrompts: values.suggestedPrompts?.split("\n").map((item) => item.trim()).filter(Boolean),
        });
      }

      return updateProjectApi(projectId, {
        name: values.name,
        description: values.description,
        instructions: values.instructions,
        context: values.context,
        tags: values.tags?.split(",").map((tag) => tag.trim()).filter(Boolean),
        suggestedPrompts: values.suggestedPrompts?.split("\n").map((item) => item.trim()).filter(Boolean),
      });
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/app/projects/${project.id}`);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectApi(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/app/projects", { replace: true });
    },
  });

  const center = (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-5">
        <Input placeholder="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="space-y-3 border-b border-border/70 px-5 py-5">
        <Button
          type="button"
          onClick={() =>
            createMutation.mutate({
              name: `New Project ${Math.floor(Date.now() / 1000)}`,
            })
          }
        >
          Create project
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredProjects.length ? (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/app/projects/${project.id}`)}
                className={`focus-ring block w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  project.id === projectId ? "border-accent/50 bg-surface-3/90 shadow-glow" : "border-border/70 bg-surface-3/70"
                }`}
              >
                <p className="font-heading text-lg text-text-base">{project.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-text-muted">{project.description ?? "No description"}</p>
                <p className="mt-4 text-xs text-text-soft">
                  Updated {formatRelativeTime(project.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="Projects"
            title="No project context yet"
            description="Create a project to capture instructions, long-form context, and suggested prompts for your AI conversations."
          />
        )}
      </div>
    </Panel>
  );

  const main = (
    <Panel className="p-5">
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-accent" />
          <h3 className="font-heading text-xl">{projectId ? "Project details" : "Create a project"}</h3>
        </div>
        <Input placeholder="Project name" {...form.register("name")} />
        <Textarea placeholder="Description" className="min-h-24" {...form.register("description")} />
        <Textarea placeholder="Instructions for AI collaboration" className="min-h-28" {...form.register("instructions")} />
        <Textarea placeholder="Broader context, requirements, notes" className="min-h-40" {...form.register("context")} />
        <Input placeholder="Tags separated by commas" {...form.register("tags")} />
        <Textarea placeholder="Suggested prompts, one per line" className="min-h-24" {...form.register("suggestedPrompts")} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save project
          </Button>
          {projectId ? (
            <Button type="button" variant="ghost" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );

  const right = (
    <Panel className="flex h-full min-h-[70vh] flex-col gap-4 p-5">
      {projectQuery.data ? (
        <>
          <div className="rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
            <h3 className="font-heading text-lg">Recent conversations</h3>
            <div className="mt-3 space-y-3">
              {projectQuery.data.conversations.length ? (
                projectQuery.data.conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => navigate(`/app/ai/${conversation.id}`)}
                    className="focus-ring block w-full rounded-2xl border border-border/70 bg-surface-1/70 px-3 py-3 text-left"
                  >
                    <p className="text-sm font-medium text-text-base">{conversation.title}</p>
                    <p className="mt-1 text-xs text-text-soft">
                      Updated {formatRelativeTime(conversation.updatedAt)}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-text-muted">No linked conversations yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
            <h3 className="font-heading text-lg">Suggested prompts</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {projectQuery.data.suggestedPrompts.length ? (
                projectQuery.data.suggestedPrompts.map((prompt) => (
                  <span key={prompt} className="rounded-full border border-border px-3 py-2 text-sm text-text-muted">
                    {prompt}
                  </span>
                ))
              ) : (
                <p className="text-sm text-text-muted">No suggested prompts yet.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          eyebrow="Project detail"
          title="Choose a project"
          description="Select a project to edit context and connect it to your AI conversation flows."
        />
      )}
    </Panel>
  );

  return (
    <WorkspaceScaffold
      eyebrow="Projects"
      title="Project context for AI collaboration"
      description="Keep reusable instructions, notes, prompts, and linked conversations together so your AI threads stay grounded in real context."
      center={center}
      main={main}
      right={right}
      rightLabel="Detail"
    />
  );
};

export default ProjectsPageImpl;
