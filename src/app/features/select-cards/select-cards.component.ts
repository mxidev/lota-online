import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Card } from '../../core/models/card.model';
import { AuthService } from '../../core/services/auth.service';
import { RoomService } from '../../core/services/room.service';

@Component({
  selector: 'app-select-cards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './select-cards.component.html',
  styleUrl: './select-cards.component.scss',
})
export class SelectCardsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private roomService = inject(RoomService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;
  errorMessage = '';

  roomCode = '';
  roomId = '';
  userId = '';

  availableCards: Card[] = [];
  selectedCardIds = new Set<string>();

  async ngOnInit(): Promise<void> {
    this.roomCode = this.route.snapshot.paramMap.get('code') ?? '';

    if (!this.roomCode) {
      this.errorMessage = 'Código de sala inválido.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      const currentUserId = await this.authService.getCurrentUserId();
      if (!currentUserId) {
        throw new Error('No hay sesión activa.');
      }

      this.userId = currentUserId;

      const lobbyData = await this.roomService.getLobbyData(this.roomCode, this.userId);
      this.roomId = lobbyData.room.id;

      const selectedCards = await this.roomService.getSelectedCards(this.roomId, this.userId);
      this.selectedCardIds = new Set(selectedCards.map((card) => card.id));

      this.availableCards = await this.roomService.getAvailableCards(this.roomId);

      for (const card of selectedCards) {
        if (!this.availableCards.find((c) => c.id === card.id)) {
          this.availableCards.unshift(card);
        }
      }

      this.errorMessage = '';
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudieron cargar los cartones.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleCard(cardId: string): void {
    if (this.selectedCardIds.has(cardId)) {
      this.selectedCardIds.delete(cardId);
      return;
    }

    if (this.selectedCardIds.size >= 2) {
      return;
    }

    this.selectedCardIds.add(cardId);
  }

  isSelected(cardId: string): boolean {
    return this.selectedCardIds.has(cardId);
  }

  async confirmSelection(): Promise<void> {
    if (this.selectedCardIds.size !== 2) {
      this.errorMessage = 'Debes seleccionar exactamente 2 cartones.';
      this.cdr.detectChanges();
      return;
    }

    try {
      this.saving = true;
      this.errorMessage = '';

      await this.roomService.selectCards(
        this.roomId,
        this.userId,
        Array.from(this.selectedCardIds)
      );

      await this.router.navigate(['/lobby', this.roomCode]);
    } catch (error) {
      console.error(error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo guardar la selección.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  trackByCardId(_: number, card: Card): string {
    return card.id;
  }
}