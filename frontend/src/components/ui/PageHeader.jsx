// Page title + subtitle + optional right-side actions
export default function PageHeader({ title, subtitle, actions, as: Heading = 'h1' }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <Heading className="text-2xl font-bold tracking-tight">{title}</Heading>
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}