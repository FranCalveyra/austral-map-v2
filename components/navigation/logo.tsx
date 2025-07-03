interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-12 w-12 brightness-0 invert" }: LogoProps) {
  return (
    <img 
      src="/assets/austral-logo.svg" 
      alt="Universidad Austral" 
      className={className} 
    />
  );
} 