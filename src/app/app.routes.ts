import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LobbyComponent } from './features/lobby/lobby.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'lobby/:code', component: LobbyComponent },
  { path: '**', redirectTo: '' },
];