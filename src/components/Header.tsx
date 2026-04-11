interface HeaderProps {
  version: string | null;
}

export function Header({ version }: HeaderProps) {
  return (
    <header className="border-b border-zaun-border bg-zaun-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">
            <span className="text-zaun-glow">Zaun</span>
            <span className="text-zaun-gold">Forge</span>
          </div>
          <span className="text-xs text-zaun-muted bg-zaun-card px-2 py-0.5 rounded">
            Build Optimizer
          </span>
        </div>
        {version && (
          <span className="text-xs text-zaun-muted">
            Patch {version}
          </span>
        )}
      </div>
    </header>
  );
}
