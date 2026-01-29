export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Category Tabs Skeleton */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 p-4">
        <div className="max-w-6xl mx-auto flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-video bg-gray-200 rounded-2xl animate-pulse" />
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
