import { motion } from "framer-motion";

export const FullScreenLoader = ({ label = "Loading" }: { label?: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface-2/80 p-8 shadow-panel backdrop-blur">
        <motion.div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-coral-500 to-amber-500"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        />
        <div className="space-y-3">
          <p className="font-heading text-lg text-text-base">{label}</p>
          <p className="text-sm text-text-muted">
            Assembling your collaborative command center.
          </p>
        </div>
      </div>
    </div>
  );
};
