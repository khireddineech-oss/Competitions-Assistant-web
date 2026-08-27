export interface Account {
  id: string;
  acc_id: string;
  name: string;
  email?: string;
  password?: string;
  token?: string;
  shared_by?: string;
  type?: 'account' | 'page';
  parentId?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  expires_at: string | null;
}
