export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-2 border-zaun-glow/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-zaun-glow rounded-full animate-spin" />
        </div>
        <div>
          <p className="text-zaun-text font-medium">Loading Data Dragon</p>
          <p className="text-sm text-zaun-muted mt-1">Fetching champions and items...</p>
        </div>
      </div>
    </div>
  );
}
