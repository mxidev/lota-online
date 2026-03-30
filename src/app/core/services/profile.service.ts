import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  constructor(private supabaseService: SupabaseService) {}

  async upsertProfile(userId: string, nickname: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          nickname,
        },
        { onConflict: 'id' }
      );

    if (error) {
      throw error;
    }
  }
}