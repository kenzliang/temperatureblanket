import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Weather Checks',
  description: 'Daily weather tracker for New England locations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
       * suppressHydrationWarning on <html>:
       * The inline script below modifies class="dark" on <html> before React
       * hydrates. Without this attribute, React sees a mismatch between SSR
       * (no class) and client DOM (class="dark") and logs a warning.
       * suppressHydrationWarning silences it for this element only.
       *
       * Why darkMode: 'class' + inline script instead of darkMode: 'media':
       * With 'media', Next.js SSR renders HTML without dark classes. The
       * browser applies dark styles only after parsing CSS — causing a visible
       * white flash. The inline script below runs synchronously before the
       * browser paints anything, setting the 'dark' class immediately and
       * eliminating the flash entirely.
       */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
