const LoadingState = ({ message = "Φόρτωση..." }: { message?: string }) => (
  <div className="flex min-h-[12rem] items-center justify-center py-20" role="status" aria-live="polite">
    <div className="text-center">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export default LoadingState;
