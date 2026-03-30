import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async ensureAnonymousSession(): Promise<string> {
    const supabase = this.supabaseService.getClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (session?.user?.id) {
      return session.user.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw error;
    }

    if (!data.user?.id) {
      throw new Error('No se pudo obtener el usuario anónimo.');
    }

    return data.user.id;
  }

  async getCurrentUserId(): Promise<string | null> {
    const supabase = this.supabaseService.getClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id ?? null;
  }
}