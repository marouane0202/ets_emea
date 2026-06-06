import { API_BASE_URL } from "@/app/auth/AuthService";

export type Session = {
  id: string;
  language: string;
  date: string;
  time: string;
  location: string;
  numberOfSeats: number;
  availableSpaces: number;
};

export type Reservation = {
  id: string;
  reservedAt: string;
  session: {
    id: string;
    language: string;
    date: string;
    time: string;
    location: string;
    numberOfSeats: number;
  } | null;
  bookedBy?: {
    name: string | null;
    email: string | null;
  };
};

export type BookingResult = {
  success: boolean;
  message: string;
  reservationId?: string;
};

async function getAuthToken() {
  // Reservation APIs are client-only because they rely on the browser's stored JWT.
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("reservation_token");
}

export type SessionPayload = {
  language: string;
  date: string;
  time: string;
  location: string;
  numberOfSeats: number;
};

export const ReservationService = {
  async getReservations(page: number = 1, limit: number = 10): Promise<{ reservations: Reservation[]; total: number; page: number; pageSize: number }> {
    const token = await getAuthToken();
    // Throw before fetching so callers can show a clear auth error instead of a generic network failure.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/reservations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch reservations");
    }

    const data = await response.json();
    // The backend returns a flat array, so pagination is applied locally for the current UI.
    const total = Array.isArray(data) ? data.length : 0;
    const startIndex = (page - 1) * limit;
    const paginatedData = Array.isArray(data) ? data.slice(startIndex, startIndex + limit) : [];

    return {
      reservations: paginatedData,
      total,
      page,
      pageSize: limit,
    };
  },

  async getAvailableSessions(showAll = false): Promise<Session[]> {
    const token = await getAuthToken();
    // Every sessions request is protected because availability depends on authenticated role behavior.
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Admin views can request all sessions; normal booking views omit full sessions.
    const url = `${API_BASE_URL}/api/sessions${showAll ? "?all=1" : ""}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch available sessions");
    }

    return response.json();
  },

  async getAdminSessions(): Promise<Session[]> {
    const token = await getAuthToken();
    // The admin dashboard needs the token both for identity and for the backend ROLE_ADMIN check.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/sessions?all=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch sessions");
    }

    return response.json();
  },

  async createSession(payload: SessionPayload): Promise<{ success: boolean; message: string }> {
    const token = await getAuthToken();
    // Session mutations are admin-only, so missing auth should be treated as an immediate caller error.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    // Return a normalized result so pages can handle success/error without duplicating response parsing.
    return {
      success: response.ok,
      message: response.ok ? data.status || "Session created" : data.error || "Failed to create session",
    };
  },

  async updateSession(id: string, payload: Partial<SessionPayload>): Promise<{ success: boolean; message: string }> {
    const token = await getAuthToken();
    // Require auth before building the request so partial edits cannot be attempted anonymously.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    // Preserve backend validation messages, especially for invalid dates or missing fields.
    return {
      success: response.ok,
      message: response.ok ? data.status || "Session updated" : data.error || "Failed to update session",
    };
  },

  async deleteSession(id: string): Promise<{ success: boolean; message: string }> {
    const token = await getAuthToken();
    // Deletes are irreversible in this UI, so only authenticated admin requests should reach the backend.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    // Normalize delete responses so the admin page can show one success/error state.
    return {
      success: response.ok,
      message: response.ok ? data.status || "Session deleted" : data.error || "Failed to delete session",
    };
  },

  async bookSession(sessionId: string): Promise<BookingResult> {
    const token = await getAuthToken();
    // Booking requires a user identity so capacity and duplicate checks are tied to the right account.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/reservations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Capacity, duplicate, and role errors are user-facing, so preserve the backend message.
      return {
        success: false,
        message: data.error || "Failed to book session",
      };
    }

    return {
      success: true,
      message: data.status || "Session booked successfully",
      reservationId: data.reservationId,
    };
  },

  async cancelReservation(reservationId: string): Promise<BookingResult> {
    const token = await getAuthToken();
    // Cancellation must include the JWT so the backend can enforce reservation ownership.
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Ownership and missing-reservation failures should be shown directly in the detail screen.
      return {
        success: false,
        message: data.error || "Failed to cancel reservation",
      };
    }

    return {
      success: true,
      message: data.status || "Booking canceled",
    };
  },
};
