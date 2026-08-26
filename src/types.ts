export interface Account {
  id: string;
  name: string;
  email?: string;
  password?: string;
  token?: string;
  shared_by?: string;
  type?: 'account' | 'page';
  parentId?: string;
}

export interface User {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  expiresAt: number | null;
}
