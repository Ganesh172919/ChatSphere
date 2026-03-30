import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Mail, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { register as registerAccount } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { type RegisterSchema, registerSchema } from "@/features/auth/schemas";
import { getErrorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const RegisterPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (response) => {
      setSession(response);
      navigate("/app/ai", { replace: true });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      username: values.username,
      email: values.email,
      password: values.password,
    });
  });

  return (
    <AuthFrame
      title="Create your workspace"
      description="Create a ChatSphere account with secure cookies, in-memory access tokens, and live session refresh."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="text-accent" to="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-text-base" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <UserRoundPlus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
            <Input
              id="username"
              autoComplete="username"
              placeholder="spaceship-ops"
              className="pl-11"
              {...register("username")}
            />
          </div>
          {errors.username ? (
            <p className="text-xs text-danger-500">{errors.username.message}</p>
          ) : null}
        </div>
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
              {...register("email")}
            />
          </div>
          {errors.email ? <p className="text-xs text-danger-500">{errors.email.message}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-base" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="pl-11"
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="text-xs text-danger-500">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-base" htmlFor="confirmPassword">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-danger-500">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>
        <Button loading={mutation.isPending} type="submit" className="w-full">
          {mutation.isPending ? <LoaderCircle className="h-4 w-4" /> : <UserRoundPlus className="h-4 w-4" />}
          Create account
        </Button>
      </form>
    </AuthFrame>
  );
};

export default RegisterPage;
