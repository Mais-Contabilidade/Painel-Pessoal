export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-2 md:pt-8">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
