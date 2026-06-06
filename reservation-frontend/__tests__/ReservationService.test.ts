import { ReservationService, type SessionPayload } from '@/app/reservation/ReservationService';

const token = 'jwt-token';

function mockJsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

describe('ReservationService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('reservation_token', token);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires authentication before calling reservation endpoints', async () => {
    window.localStorage.clear();

    await expect(ReservationService.getReservations()).rejects.toThrow('Not authenticated');
    await expect(ReservationService.getAvailableSessions()).rejects.toThrow('Not authenticated');
    await expect(ReservationService.bookSession('session-1')).rejects.toThrow('Not authenticated');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches reservations and paginates client side', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([
      { id: 'r1', reservedAt: '2026-06-01 09:00:00', session: null },
      { id: 'r2', reservedAt: '2026-06-02 09:00:00', session: null },
      { id: 'r3', reservedAt: '2026-06-03 09:00:00', session: null },
    ]));

    const result = await ReservationService.getReservations(2, 2);

    expect(result).toEqual({
      reservations: [{ id: 'r3', reservedAt: '2026-06-03 09:00:00', session: null }],
      total: 3,
      page: 2,
      pageSize: 2,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/reservations',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('fetches available and admin sessions with the expected query string', async () => {
    const sessions = [{ id: 's1', language: 'French', availableSpaces: 2 }];
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(sessions))
      .mockResolvedValueOnce(mockJsonResponse(sessions));

    await expect(ReservationService.getAvailableSessions()).resolves.toEqual(sessions);
    await expect(ReservationService.getAdminSessions()).resolves.toEqual(sessions);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/sessions');
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8000/api/sessions?all=1');
  });

  it('creates, updates, and deletes sessions', async () => {
    const payload: SessionPayload = {
      language: 'French',
      date: '2026-07-01',
      time: '10:00',
      location: 'Room 1',
      numberOfSeats: 20,
    };
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'Session created' }))
      .mockResolvedValueOnce(mockJsonResponse({ status: 'Session updated' }))
      .mockResolvedValueOnce(mockJsonResponse({ status: 'Session deleted' }));

    await expect(ReservationService.createSession(payload)).resolves.toEqual({
      success: true,
      message: 'Session created',
    });
    await expect(ReservationService.updateSession('s1', { numberOfSeats: 10 })).resolves.toEqual({
      success: true,
      message: 'Session updated',
    });
    await expect(ReservationService.deleteSession('s1')).resolves.toEqual({
      success: true,
      message: 'Session deleted',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/sessions',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/sessions/s1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ numberOfSeats: 10 }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8000/api/sessions/s1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('returns session mutation errors from the backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ error: 'Invalid date format' }, false));

    await expect(ReservationService.createSession({
      language: 'French',
      date: 'bad-date',
      time: '10:00',
      location: 'Room 1',
      numberOfSeats: 20,
    })).resolves.toEqual({
      success: false,
      message: 'Invalid date format',
    });
  });

  it('books and cancels reservations', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'Session booked', reservationId: 'r1' }))
      .mockResolvedValueOnce(mockJsonResponse({ status: 'Booking canceled' }));

    await expect(ReservationService.bookSession('s1')).resolves.toEqual({
      success: true,
      message: 'Session booked',
      reservationId: 'r1',
    });
    await expect(ReservationService.cancelReservation('r1')).resolves.toEqual({
      success: true,
      message: 'Booking canceled',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/api/reservations',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ sessionId: 's1' }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/api/reservations/r1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('returns booking errors from the backend', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ error: 'No spaces available for this session' }, false));

    await expect(ReservationService.bookSession('s1')).resolves.toEqual({
      success: false,
      message: 'No spaces available for this session',
    });
  });
});
