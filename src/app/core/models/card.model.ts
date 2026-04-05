export type CardGrid = number[][];

export interface Card {
  id: string;
  name: string;
  grid: CardGrid;
  created_at: string;
}

export interface PlayerCard {
  id: string;
  room_id: string;
  player_id: string;
  card_id: string;
  slot: number;
  created_at: string;
}