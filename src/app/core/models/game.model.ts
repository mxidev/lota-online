import { Card } from './card.model';
import { Room } from './room.model';

export interface DrawEvent {
  id: string;
  room_id: string;
  number: number;
  draw_order: number;
  drawn_at: string;
}

export interface GameData {
  room: Room;
  myCards: Card[];
  drawEvents: DrawEvent[];
}