import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PaintBucket, Save, Sparkles, UserRound } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { queryClient } from "@/app/query-client";
import { getSettings, updateProfile, updateSettings } from "@/features/settings/api";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { Textarea } from "@/shared/ui/Textarea";
import { WorkspaceScaffold } from "@/shared/ui/WorkspaceScaffold";

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accentColor: z.enum(["teal", "coral", "amber", "green", "red"]),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  mentionNotifications: z.boolean(),
  smartReplies: z.boolean(),
  sentiment: z.boolean(),
  grammar: z.boolean(),
});

const profileSchema = z.object({
  displayName: z.string().min(2, "At least 2 characters").max(60, "Max 60 characters"),
  bio: z.string().max(500, "Max 500 characters").optional(),
  avatar: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

type SettingsSchema = z.infer<typeof settingsSchema>;
type ProfileSchema = z.infer<typeof profileSchema>;

const SettingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const settingsForm = useForm<SettingsSchema>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: "dark",
      accentColor: "teal",
      emailNotifications: true,
      pushNotifications: true,
      mentionNotifications: true,
      smartReplies: true,
      sentiment: true,
      grammar: true,
    },
  });
  const profileForm = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? user?.username ?? "",
      bio: user?.bio ?? "",
      avatar: user?.avatar ?? "",
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    settingsForm.reset({
      theme: settingsQuery.data.theme,
      accentColor: settingsQuery.data.accentColor as SettingsSchema["accentColor"],
      emailNotifications: settingsQuery.data.notifications.email,
      pushNotifications: settingsQuery.data.notifications.push,
      mentionNotifications: settingsQuery.data.notifications.mentions,
      smartReplies: settingsQuery.data.aiFeatures.smartReplies,
      sentiment: settingsQuery.data.aiFeatures.sentiment,
      grammar: settingsQuery.data.aiFeatures.grammar,
    });
  }, [settingsForm, settingsQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: (values: SettingsSchema) =>
      updateSettings({
        theme: values.theme,
        accentColor: values.accentColor,
        notifications: {
          email: values.emailNotifications,
          push: values.pushNotifications,
          mentions: values.mentionNotifications,
        },
        aiFeatures: {
          smartReplies: values.smartReplies,
          sentiment: values.sentiment,
          grammar: values.grammar,
        },
      }),
    onSuccess: (settings) => {
      if (user) {
        updateUser({
          ...user,
          settings,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const profileMutation = useMutation({
    mutationFn: (values: ProfileSchema) =>
      updateProfile({
        displayName: values.displayName,
        bio: values.bio,
        avatar: values.avatar || undefined,
      }),
    onSuccess: (nextUser) => {
      updateUser(nextUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearSession();
      window.location.assign("/login");
    },
  });

  const center = (
    <Panel className="flex h-full min-h-[70vh] flex-col gap-4 p-5">
      <div className="space-y-3 rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-accent" />
          <h3 className="font-heading text-lg">Profile</h3>
        </div>
        <p className="text-sm text-text-muted">{user?.email}</p>
        <div className="flex flex-wrap gap-2">
          <Badge>{user?.authProvider}</Badge>
          <Badge>{user?.onlineStatus ? "Online" : "Away"}</Badge>
        </div>
      </div>
      <div className="space-y-3 rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
        <div className="flex items-center gap-2">
          <PaintBucket className="h-4 w-4 text-coral-400" />
          <h3 className="font-heading text-lg">Live theme</h3>
        </div>
        <p className="text-sm text-text-muted">
          Theme and accent changes apply immediately after saving.
        </p>
      </div>
      <Button type="button" variant="ghost" onClick={() => logoutMutation.mutate()}>
        Sign out
      </Button>
    </Panel>
  );

  const main = (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <Panel className="p-5">
        <form className="grid gap-4" onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-accent" />
            <h3 className="font-heading text-xl">Profile settings</h3>
          </div>
          <Input placeholder="Display name" {...profileForm.register("displayName")} />
          <Input placeholder="Avatar URL" {...profileForm.register("avatar")} />
          <Textarea placeholder="Short bio" className="min-h-28" {...profileForm.register("bio")} />
          <Button type="submit" loading={profileMutation.isPending}>
            <Save className="h-4 w-4" />
            Save profile
          </Button>
        </form>
      </Panel>
      <Panel className="p-5">
        <form className="grid gap-4" onSubmit={settingsForm.handleSubmit((values) => settingsMutation.mutate(values))}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="font-heading text-xl">Experience settings</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-text-muted">
              Theme
              <select className="focus-ring rounded-2xl border border-border bg-surface-3 px-3 py-2 text-text-base" {...settingsForm.register("theme")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-text-muted">
              Accent
              <select className="focus-ring rounded-2xl border border-border bg-surface-3 px-3 py-2 text-text-base" {...settingsForm.register("accentColor")}>
                <option value="teal">Teal</option>
                <option value="coral">Coral</option>
                <option value="amber">Amber</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </label>
          </div>
          {[
            ["emailNotifications", "Email notifications"],
            ["pushNotifications", "Push notifications"],
            ["mentionNotifications", "Mention notifications"],
            ["smartReplies", "AI smart replies"],
            ["sentiment", "AI sentiment"],
            ["grammar", "AI grammar"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface-3/70 px-4 py-3 text-sm">
              <span>{label}</span>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent-rgb))]" {...settingsForm.register(field as keyof SettingsSchema)} />
            </label>
          ))}
          <Button type="submit" loading={settingsMutation.isPending}>
            <Save className="h-4 w-4" />
            Save preferences
          </Button>
        </form>
      </Panel>
    </div>
  );

  const right = (
    <Panel className="flex h-full min-h-[70vh] flex-col gap-4 p-5">
      <div className="space-y-3 rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
        <h3 className="font-heading text-lg">Current session</h3>
        <p className="text-sm text-text-muted">
          Theme: {user?.settings.theme} - Accent: {user?.settings.accentColor}
        </p>
        <p className="text-sm text-text-muted">
          Smart replies: {user?.settings.aiFeatures.smartReplies ? "On" : "Off"}
        </p>
      </div>
      <div className="space-y-3 rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
        <h3 className="font-heading text-lg">Access model</h3>
        <p className="text-sm text-text-muted">
          Refresh tokens stay in secure cookies. Access tokens stay in memory and are refreshed on demand.
        </p>
      </div>
    </Panel>
  );

  return (
    <WorkspaceScaffold
      eyebrow="Settings"
      title="Personalize the command center"
      description="Update your profile, switch theme and accent, control AI feature toggles, and manage your session."
      center={center}
      main={main}
      right={right}
      rightLabel="Preview"
    />
  );
};

export default SettingsPage;
