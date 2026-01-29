export default function MainLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin text-6xl">⏳</div>
        <p className="text-black/60 font-bold">Loading...</p>
      </div>
    </div>
  );
}
