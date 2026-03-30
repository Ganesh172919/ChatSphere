import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { login } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { type LoginSchema, loginSchema } from "@/features/auth/schemas";
import { getErrorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const redirectTo = useAuthStore((state) => state.postAuthRedirect);
  const setPostAuthRedirect = useAuthStore((state) => state.setPostAuthRedirect);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      setSession(response);
      const next = redirectTo ?? "/app/ai";
      setPostAuthRedirect(null);
      navigate(next, { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <AuthFrame
      title="Welcome back"
      description="Sign in with your ChatSphere account to continue into your AI and room workspace."
      footer={
        <span>
          Need an account?{" "}
          <Link className="text-accent" to="/register">
            Create one
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-text-base" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@team.com"
              className="pl-11"
              {...registerField("email")}
            />
          </div>
          {errors.email ? <p className="text-xs text-danger-500">{errors.email.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-text-base" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pl-11"
              {...registerField("password")}
            />
          </div>
          {errors.password ? (
            <p className="text-xs text-danger-500">{errors.password.message}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link className="text-accent" to="/forgot-password">
            Forgot password
          </Link>
          <p className="text-text-soft">Cookies stay secure. Access tokens stay in memory.</p>
        </div>
        <Button loading={mutation.isPending} type="submit" className="w-full">
          {mutation.isPending ? <LoaderCircle className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            className="focus-ring inline-flex items-center justify-center rounded-2xl border border-border bg-surface-3 px-4 py-3 text-sm font-medium text-text-base transition hover:border-border-strong hover:bg-surface-4"
            href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/auth/google`}
          >
            Continue with Google
          </a>
          <Button type="button" variant="ghost" onClick={() => navigate("/register")}>
            Create account
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
};

export default LoginPage;
