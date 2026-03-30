import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LobbyData, Room, RoomPlayer } from '../models/room.model';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  constructor(private supabaseService: SupabaseService) {}

  async createRoom(userId: string, nickname: string): Promise<Room> {
    const supabase = this.supabaseService.getClient();
    const code = await this.generateUniqueRoomCode();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: userId,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const room = data as Room;

    const { error: playerError } = await supabase.from('room_players').insert({
      room_id: room.id,
      player_id: userId,
      nickname,
      is_host: true,
    });

    if (playerError) {
      throw playerError;
    }

    return room;
  }

  async joinRoomByCode(code: string, userId: string, nickname: string): Promise<Room> {
    const supabase = this.supabaseService.getClient();
    const normalizedCode = code.trim().toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (roomError || !room) {
      throw new Error('La sala no existe.');
    }

    if (room.status !== 'waiting') {
      throw new Error('La sala ya no admite nuevos jugadores.');
    }

    const { error: playerError } = await supabase
      .from('room_players')
      .upsert(
        {
          room_id: room.id,
          player_id: userId,
          nickname,
          is_host: false,
        },
        { onConflict: 'room_id,player_id' }
      );

    if (playerError) {
      throw playerError;
    }

    return room as Room;
  }

  async getLobbyData(code: string, currentPlayerId: string): Promise<LobbyData> {
    const supabase = this.supabaseService.getClient();
    const normalizedCode = code.trim().toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (roomError || !room) {
      throw new Error('No se pudo cargar la sala.');
    }

    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });

    if (playersError) {
      throw playersError;
    }

    return {
      room: room as Room,
      players: (players ?? []) as RoomPlayer[],
      currentPlayerId,
    };
  }

  private async generateUniqueRoomCode(): Promise<string> {
    const supabase = this.supabaseService.getClient();

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateRoomCode();

      const { data, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return code;
      }
    }

    throw new Error('No se pudo generar un código único de sala.');
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'LOTA-';

    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }
}