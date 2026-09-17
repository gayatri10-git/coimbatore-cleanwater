import {
  User,
  Lake,
  IssueCategory,
  Incident,
  NotificationItem,
  AnalyticsOverview,
  HotspotPoint,
  DuplicateCheckResult,
} from "../types";

const API_BASE = "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("cleanwater_jwt_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      errorMsg = data.detail || data.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ access_token: string; user: User }>(res);
    localStorage.setItem("cleanwater_jwt_token", data.access_token);
    localStorage.setItem("cleanwater_user", JSON.stringify(data.user));
    return data;
  },

  async register(payload: { email: string; password: string; full_name: string; phone?: string }): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse<{ access_token: string; user: User }>(res);
    localStorage.setItem("cleanwater_jwt_token", data.access_token);
    localStorage.setItem("cleanwater_user", JSON.stringify(data.user));
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(res);
  },

  async getStaffMembers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/staff-members`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User[]>(res);
  },

  logout(): void {
    localStorage.removeItem("cleanwater_jwt_token");
    localStorage.removeItem("cleanwater_user");
  },

  // Lakes & Categories
  async getLakes(): Promise<Lake[]> {
    const res = await fetch(`${API_BASE}/lakes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Lake[]>(res);
  },

  async getLakeById(id: number): Promise<Lake> {
    const res = await fetch(`${API_BASE}/lakes/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Lake>(res);
  },

  async getLakeStatistics(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/lakes/${id}/statistics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getCategories(): Promise<IssueCategory[]> {
    const res = await fetch(`${API_BASE}/categories`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<IssueCategory[]>(res);
  },

  // Incidents
  async getIncidents(params?: {
    lake_id?: number;
    category_id?: number;
    user_id?: number;
    assigned_to?: number;
    severity?: string;
    status?: string;
    search?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<Incident[]> {
    const query = new URLSearchParams();
    if (params?.lake_id) query.append("lake_id", String(params.lake_id));
    if (params?.category_id) query.append("category_id", String(params.category_id));
    if (params?.user_id) query.append("user_id", String(params.user_id));
    if (params?.assigned_to) query.append("assigned_to", String(params.assigned_to));
    if (params?.severity) query.append("severity", params.severity);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.sort_by) query.append("sort_by", params.sort_by);
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.offset) query.append("offset", String(params.offset));

    const res = await fetch(`${API_BASE}/incidents?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Incident[]>(res);
  },

  async getIncidentById(id: number): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Incident>(res);
  },

  async createIncident(payload: {
    lake_id: number;
    category_id: number;
    description: string;
    severity: string;
    latitude: number;
    longitude: number;
    image_url?: string;
  }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<Incident>(res);
  },

  async checkDuplicates(params: {
    category_id: number;
    latitude: number;
    longitude: number;
    threshold_meters?: number;
  }): Promise<DuplicateCheckResult> {
    const query = new URLSearchParams({
      category_id: String(params.category_id),
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      threshold_meters: String(params.threshold_meters || 200),
    });
    const res = await fetch(`${API_BASE}/incidents/check-duplicates?${query.toString()}`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return handleResponse<DuplicateCheckResult>(res);
  },

  async uploadPhoto(file: File): Promise<{ image_url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("cleanwater_jwt_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/incidents/upload-photo`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse<{ image_url: string; filename: string }>(res);
  },

  async assignIncident(incidentId: number, assignedTo: number, note?: string): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/assign`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ assigned_to: assignedTo, note: note || "Assigned by municipal supervisor" }),
    });
    return handleResponse<Incident>(res);
  },

  async updateIncidentStatus(
    incidentId: number,
    payload: { status: string; note?: string; resolution_note?: string }
  ): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${incidentId}/status`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<Incident>(res);
  },

  // GIS Queries
  async getLakeNearbyIncidents(lakeId: number, radiusMeters = 1500): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/lake/${lakeId}/incidents-within-radius?radius_meters=${radiusMeters}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getReportsNearCoordinates(lat: number, lng: number, radiusMeters = 1000): Promise<any> {
    const res = await fetch(`${API_BASE}/gis/nearby-reports?latitude=${lat}&longitude=${lng}&radius_meters=${radiusMeters}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Analytics
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const res = await fetch(`${API_BASE}/analytics/overview`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<AnalyticsOverview>(res);
  },

  async getAnalyticsLakes(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/analytics/lakes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getAnalyticsCategories(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/analytics/categories`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getAnalyticsTrends(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/analytics/trends`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async getAnalyticsHotspots(): Promise<HotspotPoint[]> {
    const res = await fetch(`${API_BASE}/analytics/hotspots`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<HotspotPoint[]>(res);
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<NotificationItem[]>(res);
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    return handleResponse<NotificationItem>(res);
  },

  async markAllNotificationsRead(): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
};
