export type UserRole = "citizen" | "staff" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type LakeStatus = "healthy" | "warning" | "critical";

export interface Lake {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  perimeter_km: number;
  platform_health_score: number;
  status: LakeStatus;
  boundary_geojson?: string;
  created_at: string;
  active_issue_count: number;
  resolved_issue_count: number;
  total_issue_count: number;
}

export interface IssueCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon_name: string;
  color_hex: string;
  created_at: string;
}

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface IncidentStatusHistory {
  id: number;
  incident_id: number;
  old_status?: IncidentStatus;
  new_status: IncidentStatus;
  changed_by?: number;
  changer_name?: string;
  note?: string;
  timestamp: string;
}

export interface Incident {
  id: number;
  report_code: string;
  user_id: number;
  lake_id: number;
  lake_name?: string;
  category_id: number;
  category_name?: string;
  category_color?: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: number;
  assignee_name?: string;
  resolution_note?: string;
  resolved_at?: string;
  priority_score?: number;
  priority_reasons?: string[];
  status_history?: IncidentStatusHistory[];
  reporter?: User;
  assignee?: User;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  incident_id?: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsOverview {
  total_lakes: number;
  total_reports: number;
  pending_reports: number;
  in_progress_reports: number;
  resolved_reports: number;
  closed_reports: number;
  resolution_rate_percent: number;
  avg_resolution_hours: number;
  critical_unresolved_count: number;
  high_unresolved_count: number;
  disclaimer: string;
}

export interface HotspotPoint {
  id: number;
  latitude: number;
  longitude: number;
  severity: string;
  intensity: number;
  lake_name: string;
  category_name: string;
  status: string;
  report_code: string;
}

export interface DuplicateCheckResult {
  has_duplicate: boolean;
  duplicate_count: number;
  message: string;
  existing_incidents: Incident[];
}
