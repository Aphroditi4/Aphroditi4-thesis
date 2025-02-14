import { NgModule } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
  ],
  imports: [
    CanvasJSAngularChartsModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    CommonModule
  ],
  providers: []
})
export class AppModule {}
