// app/(auth)/layout.tsx
// Layout for unauthenticated routes: /login, /signup, /forgot-password
// Centered, minimal — no navbar, no sidebar.
// The login page itself handles its own padding and card centering,
// so this layout just passes through with a clean white background.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sidebar-mist">
      {children}
    </div>
  );
}
