import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { LobbyData, Room, RoomPlayer } from '../models/room.model';
import { Card } from '../models/card.model';

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

  async setReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: isReady })
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    if (error) {
      throw error;
    }
  }

  subscribeToLobby(
    roomId: string,
    onRoomChange: () => Promise<void>,
    onPlayerChange: () => Promise<void>
  ): RealtimeChannel {
    const supabase = this.supabaseService.getClient();

    const channel = supabase
      .channel(`lobby:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'lota',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        async () => {
          await onRoomChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'lota',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          await onPlayerChange();
        }
      )
      .subscribe();

    return channel;
  }

  removeChannel(channel: RealtimeChannel): void {
    const supabase = this.supabaseService.getClient();
    supabase.removeChannel(channel);
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

  async getAvailableCards(roomId: string): Promise<Card[]> {
    const supabase = this.supabaseService.getClient();

    const { data: takenCards, error: takenError } = await supabase
      .from('player_cards')
      .select('card_id')
      .eq('room_id', roomId);

    if (takenError) {
      throw takenError;
    }

    const takenIds = (takenCards ?? []).map((item) => item.card_id);

    let query = supabase.from('cards').select('*').order('created_at', { ascending: true });

    if (takenIds.length > 0) {
      query = query.not('id', 'in', `(${takenIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as Card[];
  }

  async getSelectedCards(roomId: string, playerId: string): Promise<Card[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('player_cards')
      .select(`
        slot,
        cards (
          id,
          name,
          grid,
          created_at
        )
      `)
      .eq('room_id', roomId)
      .eq('player_id', playerId)
      .order('slot', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((item: any) => item.cards)
      .filter(Boolean) as Card[];
  }

  async selectCards(roomId: string, playerId: string, cardIds: string[]): Promise<void> {
    if (cardIds.length !== 2) {
      throw new Error('Debes seleccionar exactamente 2 cartones.');
    }

    const supabase = this.supabaseService.getClient();

    await supabase
      .from('player_cards')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    const rows = cardIds.map((cardId, index) => ({
      room_id: roomId,
      player_id: playerId,
      card_id: cardId,
      slot: index + 1,
    }));

    const { error: insertError } = await supabase
      .from('player_cards')
      .insert(rows);

    if (insertError) {
      throw insertError;
    }

    const { error: playerUpdateError } = await supabase
      .from('room_players')
      .update({ has_selected_cards: true, is_ready: false })
      .eq('room_id', roomId)
      .eq('player_id', playerId);

    if (playerUpdateError) {
      throw playerUpdateError;
    }
  }
}