import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-analysis-settings',
  standalone: true, 
  imports: [    
    DropdownModule,
    FormsModule,
  ],
  templateUrl: './analysis-settings.component.html',
  styleUrls: ['./analysis-settings.component.css'],
})
export class AnalysisSettingsComponent {
  @Input() symbols: { label: string; value: string }[] = [];
  @Input() selectedSymbol: string = '';
  @Input() timeFrames: { label: string; value: string }[] = [];
  @Input() timeFrame: string = '';
  @Input() timeRanges: { label: string; value: string }[] = [];
  @Input() selectedTimeRange: string = '';
  @Input() maxGreenCandles: number = 2;
  @Input() minConsecutiveCandles: number = 5;
  @Input() significantDropThreshold: number = 5;

  @Output() updateChart = new EventEmitter<void>();
  @Output() analyzeData = new EventEmitter<void>();

  onUpdateChart() {
    this.updateChart.emit();
  }

  onAnalyzeData() {
    this.analyzeData.emit();
  }
}