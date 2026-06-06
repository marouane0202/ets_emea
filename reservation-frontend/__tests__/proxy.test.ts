jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({
      headers: new Headers({ 'x-middleware-next': '1' }),
      status: 200,
    }),
    redirect: (url: URL) => ({
      headers: new Headers({ location: url.toString() }),
      status: 307,
    }),
  },
}));

import { proxy, config } from '@/proxy';

function request(pathname: string, token?: string) {
  const url = new URL(`http://localhost${pathname}`);

  return {
    nextUrl: {
      pathname,
      search: url.search,
      clone: () => new URL(url.toString()),
    },
    cookies: {
      get: (name: string) => (name === 'reservation_token' && token ? { value: token } : undefined),
    },
  };
}

describe('proxy', () => {
  it('allows the auth route and authenticated routes', () => {
    expect(proxy(request('/auth') as never).headers.get('x-middleware-next')).toBe('1');
    expect(proxy(request('/reservation', 'jwt-token') as never).headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects unauthenticated users to auth', () => {
    const response = proxy(request('/reservation') as never);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/auth');
  });

  it('matches app routes but excludes assets and api routes', () => {
    expect(config.matcher).toEqual(['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']);
  });
});
