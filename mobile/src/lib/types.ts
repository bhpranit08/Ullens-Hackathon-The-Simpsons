export type User = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
};
export type Location = {
  lat: number;
  lng: number;
  accuracy?: number;
  observedAt?: string;
  receivedAt?: string;
  source?: "gps" | "browser" | "simulated";
  pingId?: string;
};
export type Contact = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "removed";
  active?: boolean;
  owner?: { id: string; name: string; email: string };
};
export type SessionEvent = {
  id: string;
  type: string;
  createdAt: string;
  location?: Location;
  acknowledged: boolean;
  acknowledgedAt?: string;
};
export type SafetySession = {
  id: string;
  owner: User;
  contact: Contact;
  title: string;
  activityType: string;
  status: "active" | "alerting" | "sos" | "completed";
  trackingMode: "live" | "demo";
  expectedEndTime: string;
  nextCheckInDue: string;
  checkInMinutes: number;
  lastLocation?: Location;
  createdAt: string;
  completedAt?: string;
  currentAlert?: string;
  events: SessionEvent[];
  locations: Location[];
  deliveries: { id: string; channel: string; status: string; error?: string }[];
};
export type Hazard = {
  id: string;
  category: string;
  severity: string;
  description: string;
  location: Location;
  createdAt: string;
};
export type NotificationSettings = {
  mode: string;
  emailConfigured: boolean;
  pushConfigured: boolean;
};
export type MailMessage = {
  id: string;
  subject: string;
  text: string;
  createdAt: string;
  status: string;
};
export const categories = ["Traffic", "Road", "Weather", "Wildlife", "Other"];
