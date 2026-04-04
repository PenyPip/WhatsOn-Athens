import { motion } from "framer-motion";

const LoadingState = ({ message = "Φόρτωση..." }: { message?: string }) => (
  <div className="flex items-center justify-center py-20">
    <motion.div
      className="text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </motion.div>
  </div>
);

export default LoadingState;
