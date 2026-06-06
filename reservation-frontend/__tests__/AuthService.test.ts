import {
  AuthService,
  clearAuthToken,
  getUserRolesFromToken,
  isAdminUser,
  isAuthenticatedUser,
  storeAuthToken,
} from '@/app/auth/AuthService';

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('AuthService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'reservation_token=; path=/; max-age=0';
    jest.useRealTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('parses user roles from a stored token', () => {
    const token = createJwt({ roles: ['ROLE_USER', 'ROLE_ADMIN'] });
    window.localStorage.setItem('reservation_token', token);

    expect(getUserRolesFromToken()).toEqual(['ROLE_USER', 'ROLE_ADMIN']);
    expect(isAdminUser()).toBe(true);
  });

  it('returns an empty array when no token is stored', () => {
    expect(getUserRolesFromToken()).toEqual([]);
    expect(isAdminUser()).toBe(false);
  });

  it('supports a single role string in token payloads', () => {
    expect(getUserRolesFromToken(createJwt({ roles: 'ROLE_ADMIN' }))).toEqual(['ROLE_ADMIN']);
  });

  it('rejects invalid or expired tokens', () => {
    window.localStorage.setItem('reservation_token', 'not-a-jwt');
    expect(isAuthenticatedUser()).toBe(false);

    window.localStorage.setItem('reservation_token', createJwt({ exp: Math.floor(Date.now() / 1000) - 1 }));
    expect(isAuthenticatedUser()).toBe(false);
    expect(window.localStorage.getItem('reservation_token')).toBeNull();
  });

  it('stores and clears auth tokens in localStorage and cookies', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    storeAuthToken('abc.def.ghi');
    expect(window.localStorage.getItem('reservation_token')).toBe('abc.def.ghi');
    expect(document.cookie).toContain('reservation_token=abc.def.ghi');

    clearAuthToken();
    expect(window.localStorage.getItem('reservation_token')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'reservation-auth-changed' }));
  });

  it('logs in and registers through the backend auth endpoints', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'jwt-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'User successfully registered!' }),
      } as Response);

    await expect(AuthService.login({ email: 'user@example.com', password: 'secret' })).resolves.toEqual({
      success: true,
      message: 'Operation successful.',
      token: 'jwt-token',
    });
    await expect(AuthService.register({ name: 'User', email: 'user@example.com', password: 'secret' })).resolves.toEqual({
      success: true,
      message: 'User successfully registered!',
      token: undefined,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'User', email: 'user@example.com', password: 'secret' }),
      })
    );
  });

  it('returns backend errors from failed auth requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response);

    await expect(AuthService.login({ email: 'user@example.com', password: 'bad' })).resolves.toEqual({
      success: false,
      message: 'Invalid credentials',
      token: undefined,
    });
  });

  it('sends authorized profile requests with the bearer token', async () => {
    window.localStorage.setItem('reservation_token', 'jwt-token');
    const fetchMock = (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'User updated successfully',
        user: { id: '1', name: 'Updated User', email: 'updated@example.com' },
      }),
    } as Response);

    const result = await AuthService.updateUser({ name: 'Updated User', email: 'updated@example.com' });

    expect(result.success).toBe(true);
    expect(result.data?.user.email).toBe('updated@example.com');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/user',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated User', email: 'updated@example.com' }),
        headers: expect.any(Headers),
      })
    );

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
