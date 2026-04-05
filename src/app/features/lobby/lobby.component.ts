import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/services/auth.service';
import { LobbyData } from '../../core/models/room.model';
import { RoomService } from '../../core/services/room.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
})
export class LobbyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private roomService = inject(RoomService);
  private cdr = inject(ChangeDetectorRef);
  private channel: RealtimeChannel | null = null;

  loading = true;
  readyLoading = false;
  errorMessage = '';
  copiedMessage = '';
  lobbyData: LobbyData | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadLobby();
    this.setupRealtime();
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.roomService.removeChannel(this.channel);
      this.channel = null;
    }
  }

  get currentPlayer() {
    return this.lobbyData?.players.find(
      (player) => player.player_id === this.lobbyData?.currentPlayerId
    );
  }

  get allPlayersReady(): boolean {
    if (!this.lobbyData || this.lobbyData.players.length === 0) return false;
    return this.lobbyData.players.every((player) => player.is_ready);
  }

  get isHost(): boolean {
    return !!this.currentPlayer?.is_host;
  }

  async loadLobby(): Promise<void> {
    const roomCode = this.route.snapshot.paramMap.get('code');

    if (!roomCode) {
      this.errorMessage = 'Código de sala inválido.';
      this.loading = false;
      return;
    }

    try {
      const userId = await this.authService.getCurrentUserId();

      if (!userId) {
        throw new Error('No hay sesión activa.');
      }

      this.lobbyData = await this.roomService.getLobbyData(roomCode, userId);
      this.errorMessage = '';
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo cargar la sala.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setupRealtime(): void {
    if (!this.lobbyData?.room.id) return;

    this.channel = this.roomService.subscribeToLobby(
      this.lobbyData.room.id,
      async () => {
        await this.loadLobby();
      },
      async () => {
        await this.loadLobby();
      }
    );
  }

  isCurrentPlayer(playerId: string): boolean {
    return this.lobbyData?.currentPlayerId === playerId;
  }

  async toggleReady(): Promise<void> {
    if (!this.lobbyData || !this.currentPlayer) return;

    try {
      this.readyLoading = true;

      await this.roomService.setReady(
        this.lobbyData.room.id,
        this.lobbyData.currentPlayerId,
        !this.currentPlayer.is_ready
      );
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo actualizar tu estado.';
    } finally {
      this.readyLoading = false;
      this.cdr.detectChanges();
    }
  }

  async copyRoomCode(): Promise<void> {
    if (!this.lobbyData?.room.code) return;

    try {
      await navigator.clipboard.writeText(this.lobbyData.room.code);
      this.copiedMessage = 'Código copiado.';
      setTimeout(() => {
        this.copiedMessage = '';
      }, 1500);
    } catch (error) {
      console.error(error);
      this.copiedMessage = 'No se pudo copiar.';
      setTimeout(() => {
        this.copiedMessage = '';
      }, 1500);
    }
  }
}