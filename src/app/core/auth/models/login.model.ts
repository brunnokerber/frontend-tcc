export type AppRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  role: AppRole;
  ativo: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role?: AppRole;
    ativo?: boolean;
    app_metadata?: { [key: string]: any; role?: AppRole };
    user_metadata?: { [key: string]: any; role?: AppRole };
  };
}