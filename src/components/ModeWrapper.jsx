

export const ModeWrapper = ({ children }) => {
  return (
    <div className="h-full min-h-0 w-full bg-background text-foreground">
      {children}
    </div>
  );

};