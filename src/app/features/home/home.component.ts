import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { RoomService } from '../../core/services/room.service';
import { BrowserStorageService } from '../../core/services/browser-storage.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private roomService = inject(RoomService);
  private storage = inject(BrowserStorageService);

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    nickname: ['', [Validators.required, Validators.minLength(2)]],
    roomCode: [''],
  });

  constructor() {
    const savedNickname = this.storage.getItem('nickname');
    if (savedNickname) {
      this.form.patchValue({ nickname: savedNickname });
    }
  }

  async createRoom(): Promise<void> {
    const prepared = await this.prepareUser();
    if (!prepared) return;

    const { userId, nickname } = prepared;

    try {
      this.loading = true;
      const room = await this.roomService.createRoom(userId, nickname);
      await this.router.navigate(['/lobby', room.code]);
    } catch (error) {
      console.error(error);
      this.errorMessage = this.extractErrorMessage(error, 'No se pudo crear la sala.');
    } finally {
      this.loading = false;
    }
  }

  async joinRoom(): Promise<void> {
    const roomCode = this.form.value.roomCode?.trim().toUpperCase();

    if (!roomCode) {
      this.errorMessage = 'Debes ingresar un código de sala.';
      return;
    }

    const prepared = await this.prepareUser();
    if (!prepared) return;

    const { userId, nickname } = prepared;

    try {
      this.loading = true;
      const room = await this.roomService.joinRoomByCode(roomCode, userId, nickname);
      await this.router.navigate(['/lobby', room.code]);
    } catch (error) {
      console.error(error);
      this.errorMessage = this.extractErrorMessage(error, 'No se pudo unir a la sala.');
    } finally {
      this.loading = false;
    }
  }

  private async prepareUser(): Promise<{ userId: string; nickname: string } | null> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const nickname = this.form.value.nickname!.trim();

      this.storage.setItem('nickname', nickname);

      const userId = await this.authService.ensureAnonymousSession();
      await this.profileService.upsertProfile(userId, nickname);

      return { userId, nickname };
    } catch (error) {
      console.error(error);
      this.errorMessage = this.extractErrorMessage(error, 'No se pudo iniciar la sesión.');
      return null;
    } finally {
      this.loading = false;
    }
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}