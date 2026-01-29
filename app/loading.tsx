export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin text-6xl">✨</div>
        <h1 className="text-2xl font-black text-black">LMK</h1>
        <p className="text-black/60 font-bold">Loading your personalized recommendations...</p>
      </div>
    </div>
  );
}
