import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartComponent } from './chart/chart.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CryptoDataService } from './services/crypro-data-service';
import * as signalR from '@microsoft/signalr';

interface SelectItem<T = string> {
  label: string;
  value: T;
}

interface PatternAnalysisStats {
  totalDropsCount: number;
  reversalChance: number;
  reversals: number;
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  time: string | Date;
}

interface ServerMessage {
  type: string;
  message?: string;
  time: Date | string;
  historicalCandles?: CandleData[];
  startPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  currentPrice?: number;
  reversalChance?: string;
  lowestPrice?: number;
  consecutiveCandles?: number;
  dropPercent?: string;
  expectedReversalPercent?: string;
  fromStartPercent?: string;
  candlesSinceReversal?: number;
  reversalPercent?: string;
  finalReversalPercent?: string;
}

// Нові інтерфейси для автоматичного аналізу
interface PatternExample {
  time: Date | string;
  price: number;
  dropPercent: number | string;  // Може бути як число, так і рядок з символом '%'
  reversalPercent: number | string;  // Може бути як число, так і рядок з символом '%'
  candleCount: number;
}

interface PatternConfig {
  candleCount: number;
  dropThreshold: number;
  patternsCount: number;
  reversalCount: number;
  successRate: number;
  averageReversalPercent: number;
  maxReversalPercent: number;
  examples: PatternExample[];
}

interface AutoAnalysisResult {
  symbol: string;
  timeFrame: string;
  analysisPeriod: string;
  totalPatternsAnalyzed: number;
  bestPatterns: PatternConfig[];
}

type SymbolItem = SelectItem<string>;
type TimeFrameItem = SelectItem<string>;
type TimeRangeItem = SelectItem<string>;
type RefreshIntervalItem = SelectItem<number>;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent, NgSelectModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  chartData: CandleData[] = [];
  patternSignals: any[] = [];
  symbols: SymbolItem[] = [];
  patternAnalysisStats: PatternAnalysisStats | null = null;

  // Нові властивості для автоматичного аналізу
  autoAnalysisResult: AutoAnalysisResult | null = null;
  isAnalyzing: boolean = false;

  selectedSymbol = 'SOLUSDT';
  timeFrames: TimeFrameItem[] = [
    { label: '1 хвилина', value: '1m' },
    { label: '5 хвилин', value: '5m' },
    { label: '15 хвилин', value: '15m' },
    { label: '1 година', value: '1h' },
    { label: '4 години', value: '4h' },
    { label: '1 день', value: '1d' },
  ];
  timeFrame = '1d';
  timeRanges: TimeRangeItem[] = [
    { label: '1 день', value: '1d' },
    { label: '1 тиждень', value: '1w' },
    { label: '1 місяць', value: '1m' },
    { label: '3 місяці', value: '3m' },
    { label: '6 місяців', value: '6m' },
    { label: '1 рік', value: '1y' },
  ];
  selectedTimeRange = '6m';

  maxGreenCandles = 2;
  minConsecutiveCandles = 5;
  significantDropThreshold = 5;
  refreshIntervals: RefreshIntervalItem[] = [
    { label: '1 секунда', value: 1000 },
    { label: '2 секунди', value: 2000 },
    { label: '5 секунд', value: 5000 },
    { label: '10 секунд', value: 10000 },
  ];
  selectedRefreshInterval = 1000;

  liveSignals: ServerMessage[] = [];
  isLiveAnalysisRunning = false;
  isLiveAnalysisLoading = false;

  private autoRefreshInterval: any;
  private hubConnection!: signalR.HubConnection;

  constructor(private cryptoDataService: CryptoDataService) { }

  ngOnInit(): void {
    this.setupSignalR();
    this.loadSymbols();
    this.fetchChartData();
  }

  ngOnDestroy(): void {
    this.stopLiveAnalysis();
    this.clearAutoRefresh();
    this.hubConnection?.stop();
  }

  private setupSignalR(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/analysisHub')
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveSignal', (data: ServerMessage) => this.handleServerMessage(data));

    this.hubConnection.start()
      .then(() => console.log('SignalR Connected'))
      .catch(err => console.error('SignalR Connection Error:', err));
  }

  private loadSymbols(): void {
    const cachedSymbols = localStorage.getItem('usdtPairs');
    if (cachedSymbols) {
      this.symbols = JSON.parse(cachedSymbols);
      return;
    }

    this.cryptoDataService.getUsdtPairs().subscribe({
      next: (symbols) => {
        this.symbols = symbols.map(symbol => ({ label: symbol, value: symbol }));
        localStorage.setItem('usdtPairs', JSON.stringify(this.symbols));
      },
      error: (error: unknown) => {
        console.error('Error loading symbols:', error);
        this.symbols = [{ label: 'SOLUSDT', value: 'SOLUSDT' }];
      }
    });
  }

  onSymbolChange(event: string | SymbolItem): void {
    this.selectedSymbol = typeof event === 'object' && event?.value ? event.value : event as string;
    this.resetChartData();
    this.fetchChartData();
  }

  onTimeFrameChange(event: string | TimeFrameItem): void {
    this.timeFrame = typeof event === 'object' && event?.value ? event.value : event as string;
    this.resetChartData();
    this.fetchChartData();
  }

  onTimeRangeChange(event: string | TimeRangeItem): void {
    this.selectedTimeRange = typeof event === 'object' && event?.value ? event.value : event as string;
    this.resetChartData();
    this.fetchChartData();
  }

  onRefreshIntervalChange(event: number | RefreshIntervalItem): void {
    this.selectedRefreshInterval = typeof event === 'object' && event?.value !== undefined ? event.value : event as number;
    this.setupAutoRefresh();
  }

  onMaxGreenCandlesChange(newValue: number): void {
    this.maxGreenCandles = newValue;
  }

  onMinConsecutiveCandlesChange(newValue: number): void {
    this.minConsecutiveCandles = newValue;
  }

  onSignificantDropThresholdChange(newValue: number): void {
    this.significantDropThreshold = newValue;
  }

  fetchChartData(): void {
    if (!this.selectedSymbol || !this.timeFrame) {
      alert('Будь ласка, виберіть символ і таймфрейм');
      return;
    }

    const startDate = this.formatDateToApi(this.calculateStartDate(this.selectedTimeRange));
    const endDate = this.formatDateToApi(new Date());

    this.cryptoDataService.getCandlestickData(this.selectedSymbol, this.timeFrame, startDate, endDate)
      .subscribe({
        next: (data) => {
          this.chartData = data;
          this.setupAutoRefresh();
        },
        error: (error: unknown) => console.error('Error fetching chart data:', error)
      });
  }

  // Оновлений метод аналізу даних (автоматичний аналіз)
  analyzeData(): void {
    if (!this.selectedSymbol || !this.timeFrame) {
      alert('Будь ласка, виберіть символ і таймфрейм');
      return;
    }

    this.isAnalyzing = true;
    this.patternAnalysisStats = null;
    this.patternSignals = [];
    this.autoAnalysisResult = null;

    this.cryptoDataService.autoAnalyzeData(this.selectedSymbol, this.timeFrame)
      .subscribe({
        next: (result) => {
          this.isAnalyzing = false;
          this.autoAnalysisResult = result;

          // Відображаємо загальну статистику
          this.patternAnalysisStats = {
            totalDropsCount: result.totalPatternsAnalyzed,
            reversalChance: this.calculateAverageSuccessRate(result.bestPatterns),
            reversals: this.countTotalReversals(result.bestPatterns)
          };

          // Приклади патернів для відображення на графіку
          const patternExamples: Array<{
            time: string | Date;
            price: number;
            dropPercent: number | string;
            reversalPercent: number | string;
            candleCount: number;
            redCandles: number;
            greenCandles: number;
            profitPercent: number;
          }> = [];

          for (let i = 0; i < Math.min(3, result.bestPatterns.length); i++) {
            const pattern = result.bestPatterns[i];
            pattern.examples.forEach((example: PatternExample) => {
              patternExamples.push({
                time: example.time,
                price: example.price,
                dropPercent: typeof example.dropPercent === 'number' ? example.dropPercent : parseFloat(example.dropPercent),
                reversalPercent: typeof example.reversalPercent === 'number' ? example.reversalPercent : parseFloat(example.reversalPercent),
                candleCount: example.candleCount,
                redCandles: 0,
                greenCandles: 0,
                profitPercent: this.parsePercentValue(example.reversalPercent) - this.parsePercentValue(example.dropPercent)
              });
            });
          }

          this.patternSignals = patternExamples;

          // Якщо є хороші патерни, автоматично встановлюємо параметри для лайв-аналізу
          if (result.bestPatterns.length > 0) {
            const bestPattern = result.bestPatterns[0];
            this.minConsecutiveCandles = bestPattern.candleCount;
            this.significantDropThreshold = bestPattern.dropThreshold;
            console.log(`Applied best pattern: ${bestPattern.candleCount} candles, ${bestPattern.dropThreshold}% drop threshold with ${bestPattern.successRate}% success rate`);
          }
        },
        error: (error: unknown) => {
          this.isAnalyzing = false;
          console.error('Error analyzing data:', error);
          alert('Помилка при аналізі даних');
        }
      });
  }

  // Метод для застосування параметрів обраного патерну
  useLiveAnalysisParams(pattern: PatternConfig): void {
    this.minConsecutiveCandles = pattern.candleCount;
    this.significantDropThreshold = pattern.dropThreshold;

    alert(`Параметри застосовано: ${pattern.candleCount} свічок, поріг падіння ${pattern.dropThreshold}%`);
  }

  // Допоміжні методи для роботи з результатами автоматичного аналізу
  private calculateAverageSuccessRate(patterns: PatternConfig[]): number {
    if (!patterns || patterns.length === 0) return 0;
    const totalSuccess = patterns.reduce((sum, p) => sum + p.successRate, 0);
    return Math.round(totalSuccess / patterns.length);
  }

  private countTotalReversals(patterns: PatternConfig[]): number {
    if (!patterns || patterns.length === 0) return 0;
    return patterns.reduce((sum, p) => sum + p.reversalCount, 0);
  }

  startLiveAnalysis(params: { maxGreenCandles: number; minConsecutiveCandles: number; significantDropThreshold: number }): void {
    if (this.isLiveAnalysisRunning) return;

    this.isLiveAnalysisRunning = true;
    this.isLiveAnalysisLoading = true;
    this.clearAutoRefresh();
    this.liveSignals = [];
    this.patternSignals = [];
    Object.assign(this, params);

    this.cryptoDataService.startLiveAnalysis(this.selectedSymbol, this.timeFrame,
      params.maxGreenCandles, params.minConsecutiveCandles, params.significantDropThreshold)
      .subscribe({
        next: () => {
          this.hubConnection.invoke('SubscribeToAnalysis', this.selectedSymbol, this.timeFrame)
            .then(() => this.isLiveAnalysisLoading = false)
            .catch(err => {
              console.error('Subscription error:', err);
              this.stopLiveAnalysis();
            });
        },
        error: (error: unknown) => {
          console.error('Error starting live analysis:', error);
          this.stopLiveAnalysis();
          alert('Помилка при запуску аналізу в реальному часі');
        }
      });
  }

  stopLiveAnalysis(): void {
    if (!this.isLiveAnalysisRunning) return;

    this.cryptoDataService.stopLiveAnalysis(this.selectedSymbol, this.timeFrame)
      .subscribe({
        next: () => {
          this.hubConnection.invoke('UnsubscribeFromAnalysis', this.selectedSymbol, this.timeFrame)
            .catch(err => console.error('Unsubscribe error:', err));
          this.isLiveAnalysisRunning = false;
          this.isLiveAnalysisLoading = false;
          this.setupAutoRefresh();
        },
        error: (error: unknown) => console.error('Failed to stop analysis:', error)
      });
  }

  clearSignals(): void {
    this.liveSignals = [];
    this.patternSignals = [];
  }

  private handleServerMessage(data: ServerMessage): void {
    if (!data) return;

    this.isLiveAnalysisLoading = false;

    switch (data.type) {
      case 'Init':
        console.log('Live analysis initialized:', data.message);
        break;
      case 'ChartUpdate':
        if (data.historicalCandles) {
          this.chartData = [...data.historicalCandles];
        } else if (data.currentPrice && data.time) {
          this.updateChartData({
            open: data.startPrice || this.chartData[this.chartData.length - 1]?.close || 0,
            high: data.highPrice || data.currentPrice,
            low: data.lowPrice || data.currentPrice,
            close: data.currentPrice,
            time: data.time
          });
        }
        break;
      case 'Signal':
      case 'ReversalSignal':
      case 'ReversalUpdate':
      case 'ReversalComplete':
        this.liveSignals.unshift(data);
        if (this.liveSignals.length > 50) this.liveSignals.pop();

        if (data.type === 'Signal' || data.type === 'ReversalSignal') {
          this.patternSignals.push({
            time: data.time,
            price: data.currentPrice || 0,
            reversalChance: data.reversalChance
          });
        }
        this.playAlertSound();
        break;
      case 'Error':
        console.error('Analysis error:', data.message);
        this.stopLiveAnalysis();
        alert(`Помилка аналізу: ${data.message}`);
        break;
    }
  }

  private updateChartData(newCandle: CandleData): void {
    const lastCandle = this.chartData[this.chartData.length - 1];
    const newTime = new Date(newCandle.time).getTime();
    const lastTime = lastCandle ? new Date(lastCandle.time).getTime() : 0;

    if (lastCandle && newTime === lastTime) {
      this.chartData[this.chartData.length - 1] = {
        ...lastCandle,
        high: Math.max(lastCandle.high, newCandle.high),
        low: Math.min(lastCandle.low, newCandle.low),
        close: newCandle.close
      };
    } else {
      this.chartData.push(newCandle);
      if (this.chartData.length > 1000) this.chartData.shift();
    }
  }

  private setupAutoRefresh(): void {
    this.clearAutoRefresh();
    if (this.selectedRefreshInterval > 0 && !this.isLiveAnalysisRunning) {
      this.autoRefreshInterval = setInterval(() => this.fetchLatestCandle(), this.selectedRefreshInterval);
    }
  }

  private clearAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  private fetchLatestCandle(): void {
    if (!this.selectedSymbol || !this.timeFrame) return;

    const startDate = this.formatDateToApi(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const endDate = this.formatDateToApi(new Date());

    this.cryptoDataService.getCandlestickData(this.selectedSymbol, this.timeFrame, startDate, endDate)
      .subscribe({
        next: (data) => {
          const newCandles = data.filter(nc => !this.chartData.some(ec =>
            new Date(ec.time).getTime() === new Date(nc.time).getTime()));

          if (newCandles.length) {
            this.chartData = [...this.chartData, ...newCandles]
              .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
              .slice(-1000);
          }
        },
        error: (error: unknown) => console.error('Error fetching latest candle:', error)
      });
  }

  private playAlertSound(): void {
    new Audio('assets/sounds/alert.mp3').play().catch(error =>
      console.error('Failed to play alert sound:', error));
  }

  private resetChartData(): void {
    this.chartData = [];
    this.patternSignals = [];
  }

  private formatDateToApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private calculateStartDate(timeRange: string | TimeRangeItem): Date {
    const now = new Date();
    const range = typeof timeRange === 'object' ? timeRange.value : timeRange;

    const periods: { [key: string]: () => Date } = {
      '1d': () => new Date(now.setDate(now.getDate() - 1)),
      '1w': () => new Date(now.setDate(now.getDate() - 7)),
      '1m': () => new Date(now.setMonth(now.getMonth() - 1)),
      '3m': () => new Date(now.setMonth(now.getMonth() - 3)),
      '6m': () => new Date(now.setMonth(now.getMonth() - 6)),
      '1y': () => new Date(now.setFullYear(now.getFullYear() - 1))
    };

    return periods[range]?.() || new Date(now.setMonth(now.getMonth() - 6));
  }

  parsePercentValue(value: string | number | undefined): number {
    if (value === undefined) return 0;

    if (typeof value === 'number') {
      return value;
    }

    // Якщо це рядок, видаляємо символ відсотка і перетворюємо на число
    return parseFloat(value.replace('%', ''));
  }
}