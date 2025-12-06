import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { full: { width: 120, height: 34 }, icon: { width: 32, height: 32 } },
  md: { full: { width: 160, height: 45 }, icon: { width: 40, height: 40 } },
  lg: { full: { width: 200, height: 56 }, icon: { width: 48, height: 48 } },
  xl: { full: { width: 240, height: 67 }, icon: { width: 64, height: 64 } },
};

export function Logo({
  variant = "full",
  size = "md",
  href,
  className = ""
}: LogoProps) {
  const iconDims = sizeMap[size].icon;
  const fontSize = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {(variant === "full" || variant === "icon") && (
        <Image
          src="/logos/prismo-icon-adaptive.svg"
          alt="Prismo Finance"
          width={iconDims.width}
          height={iconDims.height}
          priority
          className="transition-opacity hover:opacity-80"
        />
      )}
      {(variant === "full" || variant === "wordmark") && (
        <span className={`font-open-sans font-bold tracking-tight text-foreground ${fontSize}`}>
          Prismo
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
