import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { resetPassword } from "@/features/auth/api";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { type ResetPasswordSchema, resetPasswordSchema } from "@/features/auth/schemas";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const ResetPasswordPage = () => {
  const query = new URLSearchParams(window.location.search);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: query.get("email") ?? "",
      token: query.get("token") ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordSchema) =>
      resetPassword({
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      window.location.assign("/login");
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <AuthFrame
      title="Choose a new password"
      description="Use the token from your email to complete the reset."
      footer={
        <Link className="text-accent" to="/login">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-text-base" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email ? <p className="text-xs text-danger-500">{errors.email.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-text-base" htmlFor="token">
            Reset token
          </label>
          <Input id="token" autoComplete="one-time-code" {...register("token")} />
          {errors.token ? <p className="text-xs text-danger-500">{errors.token.message}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-base" htmlFor="newPassword">
              New password
            </label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword ? (
              <p className="text-xs text-danger-500">{errors.newPassword.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-base" htmlFor="confirmPassword">
              Confirm password
            </label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword ? (
              <p className="text-xs text-danger-500">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>
        <Button loading={mutation.isPending} type="submit" className="w-full">
          {mutation.isPending ? <LoaderCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          Update password
        </Button>
      </form>
    </AuthFrame>
  );
};

export default ResetPasswordPage;
