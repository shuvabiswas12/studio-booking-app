import { Routes } from '@angular/router';
import { StudioListComponent } from './components/studio-list/studio-list.component';

export const routes: Routes = [
  { path: '', component: StudioListComponent },
  { path: '**', redirectTo: '' },
];
