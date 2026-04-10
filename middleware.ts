import { NextRequest, NextResponse } from 'next/server';

// Applies Basic Auth to all routes except:
// - /api/jobs/* — protected separately by CRON_SECRET bearer token
// - /_next/*, /favicon.ico — static assets (excluded via matcher)
// - All routes in development (NODE_ENV=development skips auth for convenience)
//
// NOTE: Buffer is available as a global in Next.js Edge Runtime (Cloudflare
// Workers polyfill). Do NOT import { Buffer } from 'buffer' — that fails in Edge.

export function middleware(req: NextRequest): NextResponse {
  // Cron job endpoints:
  // - Bearer token (Vercel cron) → let route handler validate CRON_SECRET
  // - Same-origin fetch (Fetch Now button) → user already authed to load the page,
  //   so allow through. Browser fetch() doesn't resend Basic Auth credentials.
  if (req.nextUrl.pathname.startsWith('/api/jobs/')) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) return NextResponse.next();

    // Same-origin request from the browser (Fetch Now button)
    const origin = req.headers.get('origin') ?? '';
    const host = req.headers.get('host') ?? '';
    if (origin && host && origin.includes(host)) {
      return NextResponse.next();
    }
  }

  // Skip auth entirely in local development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const [scheme, encoded] = authHeader.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx !== -1) {
      const user = decoded.slice(0, colonIdx);
      const pass = decoded.slice(colonIdx + 1);
      if (
        user === process.env.BASIC_AUTH_USER &&
        pass === process.env.BASIC_AUTH_PASS
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Temperature Blanket", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
