import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, FolderKanban, Layers3, MessagesSquare, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import { fetchProjects, type ProjectSummary } from '../api/projects';

function formatActivity(date: string | null) {
  if (!date) {
    return 'No chats yet';
  }

  const value = new Date(date);
  const now = Date.now();
  const diffHours = Math.floor((now - value.getTime()) / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Updated just now';
  }

  if (diffHours < 24) {
    return `Updated ${diffHours}h ago`;
  }

  return `Updated ${value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setProjects(await fetchProjects());
      } catch (error) {
        console.error('Failed to load projects', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProjects();
  }, []);

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-[2rem] border border-neon-purple/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_38%),rgba(18,20,31,0.94)] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-neon-purple">Projects</p>
              <h1 className="font-display text-4xl font-bold text-white">Persistent AI workspaces for ongoing context.</h1>
              <p className="mt-3 text-sm leading-7 text-gray-400">
                Keep instructions, reference files, and all related chats together so ChatSphere can answer inside the
                same project context each time you come back.
              </p>
            </div>

            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/30"
            >
              <Sparkles size={16} />
              Open Project Chat
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FolderKanban,
              title: 'Persistent brief',
              text: 'Save project instructions, goals, tone, and important background once.',
            },
            {
              icon: FileText,
              title: 'Reusable files',
              text: 'Attach docs and notes to a project so they travel with every chat in that workspace.',
            },
            {
              icon: Layers3,
              title: 'Focused history',
              text: 'Keep separate chat threads per project instead of mixing unrelated tasks together.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-navy-700/60 bg-navy-800/75 p-5 backdrop-blur-xl">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/80 to-neon-blue/80">
                <Icon size={18} className="text-white" />
              </div>
              <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">{text}</p>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-3xl border border-navy-700/50 bg-navy-800/70" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-navy-600/60 bg-navy-800/60 px-6 py-16 text-center">
            <MessagesSquare size={36} className="mx-auto mb-4 text-neon-purple" />
            <h2 className="font-display text-2xl font-semibold text-white">No projects yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Create your first project inside AI chat to give ChatSphere a stable workspace with context, files, and
              dedicated conversations.
            </p>
            <Link
              to="/chat"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-neon-purple/30 bg-neon-purple/10 px-4 py-2 text-sm font-medium text-neon-purple"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-[1.75rem] border border-navy-700/60 bg-navy-800/80 p-6 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">Project</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-white">{project.name}</h2>
                  </div>
                  <div className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-3 py-1 text-[11px] font-medium text-neon-blue">
                    {project.conversationCount} chats
                  </div>
                </div>

                <p className="mt-4 min-h-[4.5rem] text-sm leading-7 text-gray-400">
                  {project.description || 'A reusable project workspace with dedicated context and file memory.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-navy-600/60 bg-navy-900/50 px-3 py-1 text-[11px] text-gray-300">
                      #{tag}
                    </span>
                  ))}
                  {project.files.length > 0 ? (
                    <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-[11px] text-neon-purple">
                      {project.files.length} file{project.files.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatActivity(project.lastConversationAt || project.updatedAt)}</span>
                  <Link
                    to={`/chat?project=${project.id}`}
                    className="inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-neon-purple"
                  >
                    Open workspace
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
