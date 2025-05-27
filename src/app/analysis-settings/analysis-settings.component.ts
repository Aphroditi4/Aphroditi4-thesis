// analysis-settings.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CryptoDataService } from '../services/crypro-data-service';

@Component({
  selector: 'app-analysis-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './analysis-settings.component.html',
  styleUrls: ['./analysis-settings.component.css'],
})
export class AnalysisSettingsComponent implements OnInit {
  @Input() symbols: { label: string; value: string }[] = [];
  @Input() selectedSymbol: string = '';
  @Input() timeFrames: { label: string; value: string }[] = [];
  @Input() timeFrame: string = '';
  @Input() timeRanges: { label: string; value: string }[] = [];
  @Input() selectedTimeRange: string = '';
  @Input() maxGreenCandles: number = 2;
  @Input() minConsecutiveCandles: number = 5;
  @Input() significantDropThreshold: number = 5;
  @Input() refreshIntervals: { label: string; value: number }[] = [];
  @Input() selectedRefreshInterval: number = 1000;

  @Output() symbolChange = new EventEmitter<string>();
  @Output() timeFrameChange = new EventEmitter<string>();
  @Output() timeRangeChange = new EventEmitter<string>();
  @Output() maxGreenCandlesChange = new EventEmitter<number>();
  @Output() minConsecutiveCandlesChange = new EventEmitter<number>();
  @Output() significantDropThresholdChange = new EventEmitter<number>();
  @Output() refreshIntervalChange = new EventEmitter<number>();
  @Output() updateChart = new EventEmitter<void>();
  @Output() analyzeData = new EventEmitter<void>();
  @Output() startRealTimeAnalysis = new EventEmitter<{
    maxGreenCandles: number;
    minConsecutiveCandles: number;
    significantDropThreshold: number;
  }>();

  patternStatistics: any[] = [];
  isLoadingStatistics: boolean = false;
  selectedPattern: any = null;

  constructor(private cryptoDataService: CryptoDataService) {}

  ngOnInit(): void {
    if (!this.maxGreenCandles) this.maxGreenCandles = 2;
    if (!this.minConsecutiveCandles) this.minConsecutiveCandles = 5;
    if (!this.significantDropThreshold) this.significantDropThreshold = 5;
  }

  onSymbolChange() {
    console.log('Symbol changed to:', this.selectedSymbol);
    this.symbolChange.emit(this.selectedSymbol);
  }

  onTimeFrameChange() {
    console.log('TimeFrame changed to:', this.timeFrame);
    this.timeFrameChange.emit(this.timeFrame);
  }

  onTimeRangeChange() {
    console.log('TimeRange changed to:', this.selectedTimeRange);
    this.timeRangeChange.emit(this.selectedTimeRange);
  }

  onMaxGreenCandlesChange() {
    console.log('MaxGreenCandles changed to:', this.maxGreenCandles);
    this.maxGreenCandlesChange.emit(this.maxGreenCandles);
  }

  onMinConsecutiveCandlesChange() {
    console.log('MinConsecutiveCandles changed to:', this.minConsecutiveCandles);
    this.minConsecutiveCandlesChange.emit(this.minConsecutiveCandles);
  }

  onSignificantDropThresholdChange() {
    console.log('SignificantDropThreshold changed to:', this.significantDropThreshold);
    this.significantDropThresholdChange.emit(this.significantDropThreshold);
  }

  onRefreshIntervalChange() {
    console.log('RefreshInterval changed to:', this.selectedRefreshInterval);
    this.refreshIntervalChange.emit(this.selectedRefreshInterval);
  }

  onUpdateChart() {
    this.updateChart.emit();
  }

  onAnalyzeData() {
    this.analyzeData.emit();
  }

  onStartRealTimeAnalysis() {
    this.startRealTimeAnalysis.emit({
      maxGreenCandles: this.maxGreenCandles,
      minConsecutiveCandles: this.minConsecutiveCandles,
      significantDropThreshold: this.significantDropThreshold,
    });
  }

  loadPatternStatistics() {
    if (!this.selectedSymbol || !this.timeFrame) {
      alert('Будь ласка, виберіть символ і таймфрейм');
      return;
    }

    this.isLoadingStatistics = true;
    this.patternStatistics = [];

    const config = {
      historyMonths: 6,
      minCandleCount: 3,
      maxCandleCount: 12,
      minDropThreshold: 0,
      recoveryPeriod: 10,
      topResultsCount: 20,
    };

    this.cryptoDataService.getPatternStatistics(this.selectedSymbol, this.timeFrame, config).subscribe({
      next: (data) => {
        this.patternStatistics = data;
        this.isLoadingStatistics = false;
      },
      error: (error) => {
        console.error('Error loading pattern statistics:', error);
        this.isLoadingStatistics = false;
        alert('Помилка при завантаженні статистики патернів');
      },
    });
  }

  selectPattern(pattern: any) {
    this.selectedPattern = pattern;
    this.minConsecutiveCandles = pattern.candleCount;
    this.significantDropThreshold = pattern.dropPercent;
    this.minConsecutiveCandlesChange.emit(this.minConsecutiveCandles);
    this.significantDropThresholdChange.emit(this.significantDropThreshold);
    console.log(
      `Обрано патерн: ${pattern.candleCount} свічок з середнім падінням ${pattern.dropPercent}% та шансом розвороту ${pattern.averageReversalPercent}%`
    );
  }
}