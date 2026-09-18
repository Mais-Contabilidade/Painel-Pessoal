export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[12.5px] font-medium transition-colors ${
        active
          ? "bg-accent-soft text-accent"
          : "bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      {children}
    </Tag>
  );
}
