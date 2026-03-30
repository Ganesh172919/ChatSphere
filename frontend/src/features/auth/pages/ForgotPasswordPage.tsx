import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/features/auth/api";
import { AuthFrame } from "@/features/auth/components/AuthFrame";
import { type ForgotPasswordSchema, forgotPasswordSchema } from "@/features/auth/schemas";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordSchema) => requestPasswordReset(values.email),
    onSuccess: () => reset(),
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <AuthFrame
      title="Reset your password"
      description="We’ll email a reset link if the address exists."
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
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@team.com"
            {...register("email")}
          />
          {errors.email ? <p className="text-xs text-danger-500">{errors.email.message}</p> : null}
        </div>
        <Button loading={mutation.isPending} type="submit" className="w-full">
          {mutation.isPending ? <LoaderCircle className="h-4 w-4" /> : <MailCheck className="h-4 w-4" />}
          Send reset email
        </Button>
        <p className="text-sm text-text-muted">
          Use the link from your email to return to the password reset screen.
        </p>
      </form>
    </AuthFrame>
  );
};

export default ForgotPasswordPage;
