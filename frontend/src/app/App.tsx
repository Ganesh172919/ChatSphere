import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";

export const App = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster
        richColors
        closeButton
        theme="dark"
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "border border-border bg-surface-2 text-text-base",
            title: "font-heading text-sm",
            description: "text-xs text-text-muted",
          },
        }}
      />
    </AppProviders>
  );
};
