import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private roomService = inject(RoomService);

  loading = true;
  errorMessage = '';
  lobbyData: LobbyData | null = null;

  async ngOnInit(): Promise<void> {
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
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo cargar la sala.';
    } finally {
      this.loading = false;
    }
  }

  isCurrentPlayer(playerId: string): boolean {
    return this.lobbyData?.currentPlayerId === playerId;
  }
}