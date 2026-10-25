export interface ProfileResumo {
  id: string;
  email?: string;
  role?: string;
}

export interface Audit {
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
  editor?: ProfileResumo | null;
}
