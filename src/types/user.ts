export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  specialty?: string;
  avatarUrl?: string;
  address?: string;
  telephone?: string;
  [key: string]: unknown;
}
