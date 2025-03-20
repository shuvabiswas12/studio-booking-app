import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { StudioCardComponent } from './components/studio-card/studio-card.component';
import { StudioListComponent } from './components/studio-list/studio-list.component';
import { BookingFormComponent } from './components/booking-form/booking-form.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { StudioService } from './services/studio.service';

@NgModule({
  declarations: [
    AppComponent,
    StudioCardComponent,
    StudioListComponent,
    BookingFormComponent,
    NavbarComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: '', component: StudioListComponent },
      { path: '**', redirectTo: '' },
    ]),
  ],
  providers: [StudioService],
  bootstrap: [AppComponent],
})
export class AppModule {}
