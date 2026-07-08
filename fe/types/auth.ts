/**
 * Auth types — đồng bộ với BE response /auth/login, /auth/register, /auth/me.
 */

export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  googleId?: string | null;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
}
