// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Core Palette ---
        // Main backgrounds
        background: {
          DEFAULT: '#111827', // Very dark gray for the main page background
          surface: '#1f2937', // Slightly lighter dark gray for cards, panels, or secondary backgrounds
          darker: '#0a0a0a', // Even darker shade for deepest backgrounds if needed (e.g., modals)
        },
        // Main text colors
        foreground: {
          DEFAULT: '#ffffff', // Pure white for primary text on dark backgrounds
          subtle: '#d1d5db', // Lighter gray for less prominent text (e.g., descriptions, helper text)
          muted: '#9ca3af',  // Even lighter gray for muted text, placeholders, disabled states
        },

        // --- Action & UI Colors ---
        // Primary actions (e.g., main buttons, active states, important elements)
        primary: {
          DEFAULT: '#2563eb', // A vibrant blue
          light: '#3b82f6',   // Lighter blue for hover/focus (if different from DEFAULT hover)
          dark: '#1e40af',    // Darker blue for pressed states or deeper elements
          foreground: '#ffffff', // Text color for primary background
          hover: '#1d4ed8',   // Specific hover color for primary
        },
        // Secondary actions (e.g., secondary buttons, outlines, less emphasized elements)
        secondary: {
          DEFAULT: '#6b7280', // A neutral medium gray
          light: '#9ca3af',   // Lighter shade of secondary
          dark: '#4b5563',    // Darker shade of secondary
          foreground: '#ffffff', // Text color for secondary background
          hover: '#4b5563',   // Specific hover color for secondary
        },
        // Accent/Highlight color (for call-to-actions, warnings, highlights)
        accent: {
          DEFAULT: '#fde047', // A bright yellow/gold
          foreground: '#1f2937', // Dark text on accent background for readability
        },
        // Destructive/Error color (for delete buttons, error messages)
        destructive: {
          DEFAULT: '#ef4444', // A strong red
          foreground: '#ffffff', // Text color for destructive background
        },

        // --- Component Specific Colors ---
        // Border color (for dividers, outlines)
        border: '#4b5563', // A darker gray for borders and separators

        // Input field colors
        input: {
          DEFAULT: '#374151', // Dark gray for input background
          border: '#6b7280', // Border for inputs
          placeholder: '#9ca3af', // Placeholder text color
        },

        // Ring/Focus color (often matches primary color for focus rings)
        ring: '#2563eb',

        // Card background (can use `background.surface` or define specific `card` color)
        card: {
          DEFAULT: '#1f2937', // Matches `background.surface` for consistency
          foreground: '#ffffff',
        },
        // Popover/Dropdown background
        popover: {
          DEFAULT: '#111827', // Matches `background.DEFAULT`
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};
