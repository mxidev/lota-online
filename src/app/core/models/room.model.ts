export type RoomStatus = 'waiting' | 'in_progress' | 'finished';

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  created_at: string;
  started_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  nickname: string;
  is_host: boolean;
  has_selected_cards: boolean;
  is_ready: boolean;
  is_disqualified: boolean;
  joined_at: string;
}

export interface LobbyData {
  room: Room;
  players: RoomPlayer[];
  currentPlayerId: string;
}