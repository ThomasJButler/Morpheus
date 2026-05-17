// Pulls @testing-library/jest-dom's matcher type augmentation into the
// TypeScript program. jest.setup.js imports the package at runtime, but
// that .js import doesn't surface the `toBeInTheDocument` / `toHaveValue`
// / `toBeDisabled` / `toHaveFocus` matcher types to `tsc --noEmit`.
import '@testing-library/jest-dom';
