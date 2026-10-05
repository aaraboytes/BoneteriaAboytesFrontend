export interface User {
  id: number;
  fullName: string;
  username?: string;
  email: string;
  role: string;
  /** Permission codes granted by the server, e.g. 'pos.sell'. */
  permissions?: string[];
  storeId?: number | null;
  specialty?: string;
  avatarUrl?: string;
  address?: string;
  telephone?: string;
  [key: string]: unknown;
}
