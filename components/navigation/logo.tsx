interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-12 w-12 rounded-lg" }: LogoProps) {
  return (
    <img
      src="/assets/austral-map-icon.png"
      alt="Austral Map"
      className={className}
    />
  );
} 