import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/services/auth.service';
import { GameData } from '../../core/models/game.model';
import { RoomService } from '../../core/services/room.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private roomService = inject(RoomService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';
  gameData: GameData | null = null;
  private channel: RealtimeChannel | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadGame();
    this.setupRealtime();
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.roomService.removeChannel(this.channel);
      this.channel = null;
    }
  }

  async loadGame(): Promise<void> {
    const roomCode = this.route.snapshot.paramMap.get('code');

    if (!roomCode) {
      this.errorMessage = 'Código de sala inválido.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      const userId = await this.authService.getCurrentUserId();

      if (!userId) {
        throw new Error('No hay sesión activa.');
      }

      this.gameData = await this.roomService.getGameData(roomCode, userId);
      this.errorMessage = '';
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo cargar la partida.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setupRealtime(): void {
    if (!this.gameData?.room.id) return;

    if (this.channel) {
      this.roomService.removeChannel(this.channel);
      this.channel = null;
    }

    this.channel = this.roomService.subscribeToGame(
      this.gameData.room.id,
      async () => {
        await this.loadGame();
      },
      async () => {
        await this.loadGame();
      }
    );
  }

  get currentNumber(): number | null {
    return this.gameData?.room.current_number ?? null;
  }

  get drawHistory(): number[] {
    return (this.gameData?.drawEvents ?? []).map((event) => event.number).reverse();
  }
}