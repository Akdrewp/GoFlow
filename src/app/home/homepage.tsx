import React from 'react';

// Main App component for the GoFlow homepage
export default function HomePage() {
    return (
    // The main container for the entire page.
    // min-h-screen ensures it takes at least the full height of the viewport.
    // flex, items-center, and justify-center will center the content vertically and horizontally.
    // p-4 adds padding on all sides, responsive for different screen sizes.
    // Using custom `bg-background` for the main background color, defined in tailwind.config.js.
    // Using `text-foreground` for the default text color on the page, defined in tailwind.config.js.
    // rounded-lg applies rounded corners to the body for a softer look.
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground rounded-lg">
      {/* Content wrapper for centering and max-w-md */}
      <div className="text-center max-w-md w-full">
        {/* Application Name */}
        {/* text-5xl on mobile, md:text-6xl on medium screens and larger for larger text */}
        {/* font-extrabold for a strong, prominent look */}
        {/* mb-4 adds margin-bottom for spacing below the title */}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          GoFlow
        </h1>

        {/* Brief Description */}
        {/* text-lg on mobile, md:text-xl on medium screens for a slightly larger description */}
        {/* Using `text-subtle` for the description text, defined in tailwind.config.js */}
        {/* mb-8 adds more margin-bottom to separate from the button */}
        <p className="text-lg md:text-xl text-subtle mb-8">
          Optimize your routes, manage stops, and streamline your delivery and service jobs with GoFlow.
          Efficiency on the go, for every journey.
        </p>

        {/* Sign Up Button */}
        {/* Using custom `bg-primary`, `hover:bg-primary-hover`, and `text-primary-foreground` for the button,
            all defined in tailwind.config.js. */}
        {/* font-bold, py-3 px-6, rounded-full, shadow-lg, transition-colors duration-300 for styling. */}
        {/* focus:outline-none and focus:ring-2 for accessibility when focused */}
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
