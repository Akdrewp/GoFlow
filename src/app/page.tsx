export default function HomePage() {
    return (

    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground rounded-lg">
      {/* Content wrapper for centering and max-w-md */}
      <div className="text-center max-w-md w-full">
        {/* Application Name */}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          GoFlow
        </h1>

        {/* Brief Description */}
        <p className="text-lg md:text-xl text-subtle mb-8">
          Optimize your routes, manage stops, and streamline your delivery and service jobs with GoFlow.
          Efficiency on the go, for every journey.
        </p>

        {/* Sign Up Button */}
        <a href="/signup">
            <button
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-6 rounded-full
                      shadow-lg transition-colors duration-300 focus:outline-none focus:ring-2
                      focus:ring-primary focus:ring-opacity-75"
          >
            Sign Up Now
          </button>
        </a>
      </div>
    </div>
  );
}