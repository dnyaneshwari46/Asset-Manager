export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center glass p-12 rounded-3xl">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500 mb-4">
          404
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
          Go back home
        </a>
      </div>
    </div>
  );
}