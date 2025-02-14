import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { ChartComponent } from './chart/chart.component';
import { AnalysisSettingsComponent } from './analysis-settings/analysis-settings.component';
import { LiveAnalysisComponent } from './live-analysis/live-analysis.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TabViewModule,
    FormsModule,
    DropdownModule,
    ButtonModule,
    ChartComponent,
    AnalysisSettingsComponent,
    LiveAnalysisComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  timeFrame: string = '1d';
  symbols: { label: string; value: string }[] = [];
  selectedSymbol: string = 'SOLUSDT';
  selectedTimeRange: string = '30d';
  chartData: any[] = [];
  liveSignals: string[] = [];
  maxGreenCandles: number = 2;
  minConsecutiveCandles: number = 5;
  significantDropThreshold: number = 5;
  analysisResult: string | null = null;
  isLoading: boolean = false;
  eventSource: EventSource | null = null;

  timeFrames: { label: string; value: string }[] = [
    { label: '1 Minute', value: '1m' },
    { label: '3 Minutes', value: '3m' },
    { label: '5 Minutes', value: '5m' },
    { label: '15 Minutes', value: '15m' },
    { label: '30 Minutes', value: '30m' },
    { label: '1 Hour', value: '1h' },
    { label: '2 Hours', value: '2h' },
    { label: '4 Hours', value: '4h' },
    { label: '6 Hours', value: '6h' },
    { label: '8 Hours', value: '8h' },
    { label: '12 Hours', value: '12h' },
    { label: '1 Day', value: '1d' },
    { label: '3 Days', value: '3d' },
    { label: '1 Week', value: '1w' },
    { label: '1 Month', value: '1M' },
  ];

  timeRanges: { label: string; value: string }[] = [
    { label: 'Last 2 Weeks', value: '14d' },
    { label: 'Last 1 Month', value: '30d' },
    { label: 'Last 2 Months', value: '60d' },
    { label: 'Last 3 Months', value: '90d' },
    { label: 'Last 6 Months', value: '180d' },
    { label: 'Last Year', value: '365d' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchSymbols();
    this.fetchChartData();
  }

  fetchSymbols() {
    const symbolsUrl = 'http://localhost:5000/api/fetchusdtpairs';
    this.http.get<string[]>(symbolsUrl).subscribe(
      (data) => {
        this.symbols = data.map((symbol) => ({ label: symbol, value: symbol }));
        if (this.symbols.length > 0) {
          this.selectedSymbol = this.symbols[0].value;
        }
      },
      (error) => {
        console.error('Error fetching symbols:', error);
      }
    );
  }

  fetchChartData() {
    const daysToSubtract = parseInt(this.selectedTimeRange.replace('d', ''));
    const startDate = new Date(Date.now() - daysToSubtract * 24 * 60 * 60 * 1000);

    const apiUrl = `http://localhost:5000/api/fetchcandlestickdata?symbol=${this.selectedSymbol}&timeFrame=${this.timeFrame}&startDate=${startDate.toISOString()}`;

    this.isLoading = true;
    this.http.get<any[]>(apiUrl).subscribe(
      (data) => {
        this.chartData = data.map((point) => ({
          x: new Date(point.time).getTime(),
          y: [point.open, point.high, point.low, point.close],
        }));
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching chart data:', error);
        this.isLoading = false;
      }
    );
  }

  analyzeData() {
    // Логіка аналізу даних
  }

  startLiveAnalysisHandler() {
    // Логіка для лайв-аналізу
  }

  stopLiveAnalysisHandler() {
    // Логіка для зупинки лайв-аналізу
  }
}