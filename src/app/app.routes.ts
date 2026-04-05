import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LobbyComponent } from './features/lobby/lobby.component';
import { SelectCardsComponent } from './features/select-cards/select-cards.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'lobby/:code', component: LobbyComponent },
  { path: 'lobby/:code/cards', component: SelectCardsComponent },
  { path: '**', redirectTo: '' },
];