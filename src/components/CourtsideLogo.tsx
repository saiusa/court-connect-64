import logoImg from "@/assets/courtside_logo.png";

export function CourtsideLogo({ className = "", size = "default" }: { className?: string; size?: "sm" | "default" | "lg" | "xl" }) {
  const sizes = {
    sm: "h-8",
    default: "h-10",
    lg: "h-16",
    xl: "h-24",
  };

  return (
    <img
      src={logoImg}
      alt="Courtside"
      className={`${sizes[size]} w-auto mix-blend-screen ${className}`}
      decoding="async"
      loading="eager"
    />
  );
}
