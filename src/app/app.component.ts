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

// Інтерфейси для індикаторного аналізу
interface PatternExample {
  time: Date | string;
  price: number;
  dropPercent: number;
  reversalPercent: number;
  pressureIntensity: number;
  recoverySpeed: number;
}

interface PatternConfig {
  dropThreshold: number;
  patternsCount: number;
  reversalCount: number;
  successRate: number;
  averageReversalPercent: number;
  maxReversalPercent: number;
  averageRecoverySpeed: number;
  averagePressureIntensity: number;
  examples: PatternExample[];
}

interface AutoAnalysisResult {
  symbol: string;
  timeFrame: string;
  dataSource: string;
  analysisPeriod: string;
  totalPatternsAnalyzed: number;
  indicatorAnalysis: string;
  bestPatterns: PatternConfig[];
  interpretation: {
    [key: string]: string;
  };
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
  
  // Константи
  readonly MIN_DROP_THRESHOLD = 3;

  // Властивості для індикаторного аналізу
  autoAnalysisResult: AutoAnalysisResult | null = null;
  isAnalyzing: boolean = false;

  // Стан індикаторів
  pressureDownActive: boolean = false;
  recoveryTrackerActive: boolean = false;
  currentDropPercent: string = '0';
  pressureIntensity: string = '0';
  redCandlesCount: number = 0;
  recoveryPercent: string = '0';
  recoverySpeed: string = '0';
  fromStartPercent: string = '0';

  selectedSymbol = 'SOLUSDT';
  timeFrames: TimeFrameItem[] = [
    { label: '1 хвилина', value: '1m' },
    { label: '5 хвилин', value: '5m' },
    { label: '15 хвилин', value: '15m' },
    { label: '1 година', value: '1h' },
    { label: '4 години', value: '4h' },
    { label: '1 день', value: '1d' },
  ];
  timeFrame = '1h';
  timeRanges: TimeRangeItem[] = [
    { label: '1 день', value: '1d' },
    { label: '1 тиждень', value: '1w' },
    { label: '1 місяць', value: '1m' },
    { label: '3 місяці', value: '3m' },
    { label: '6 місяців', value: '6m' },
    { label: '1 рік', value: '1y' },
  ];
  selectedTimeRange = '1m';

  maxGreenCandles = 2;
  minConsecutiveCandles = 5; // Не використовується з індикаторами
  significantDropThreshold = 5; // Мінімум 3%
  refreshIntervals: RefreshIntervalItem[] = [
    { label: '1 секунда', value: 1000 },
    { label: '2 секунди', value: 2000 },
    { label: '5 секунд', value: 5000 },
    { label: '10 секунд', value: 10000 },
  ];
  selectedRefreshInterval = 2000;

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

  onSignificantDropThresholdChange(newValue: number): void {
    // Забезпечуємо мінімальний поріг 3%
    this.significantDropThreshold = Math.max(newValue, this.MIN_DROP_THRESHOLD);
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

  // Оновлений метод аналізу даних для індикаторів
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
          const patternExamples: any[] = [];

          for (let i = 0; i < Math.min(3, result.bestPatterns.length); i++) {
            const pattern = result.bestPatterns[i];
            if (pattern.examples) {
              pattern.examples.forEach((example: PatternExample) => {
                patternExamples.push({
                  time: example.time,
                  price: example.price,
                  dropPercent: example.dropPercent,
                  reversalPercent: example.reversalPercent,
                  pressureIntensity: example.pressureIntensity,
                  recoverySpeed: example.recoverySpeed
                });
              });
            }
          }

          this.patternSignals = patternExamples;

          // Якщо є хороші патерни, автоматично встановлюємо параметри для лайв-аналізу
          if (result.bestPatterns.length > 0) {
            const bestPattern = result.bestPatterns[0];
            this.significantDropThreshold = bestPattern.dropThreshold;
            console.log(`Застосовано індикаторні параметри: поріг ${bestPattern.dropThreshold}% з успішністю ${bestPattern.successRate}%`);
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
    this.significantDropThreshold = pattern.dropThreshold;
    
    alert(`Індикатори налаштовано: поріг спаду ${pattern.dropThreshold}% з середньою швидкістю відновлення ${pattern.averageRecoverySpeed}%/св`);
  }

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

    // Забезпечуємо мінімальний поріг
    params.significantDropThreshold = Math.max(params.significantDropThreshold, this.MIN_DROP_THRESHOLD);

    this.isLiveAnalysisRunning = true;
    this.isLiveAnalysisLoading = true;
    this.clearAutoRefresh();
    this.liveSignals = [];
    this.patternSignals = [];
    this.resetIndicatorStates();
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
          alert('Помилка при запуску індикаторного аналізу');
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
          this.resetIndicatorStates();
          this.setupAutoRefresh();
        },
        error: (error: unknown) => console.error('Failed to stop analysis:', error)
      });
  }

  clearSignals(): void {
    this.liveSignals = [];
    this.patternSignals = [];
    this.resetIndicatorStates();
  }

  private resetIndicatorStates(): void {
    this.pressureDownActive = false;
    this.recoveryTrackerActive = false;
    this.currentDropPercent = '0';
    this.pressureIntensity = '0';
    this.redCandlesCount = 0;
    this.recoveryPercent = '0';
    this.recoverySpeed = '0';
    this.fromStartPercent = '0';
  }

  private handleServerMessage(data: ServerMessage): void {
    if (!data) return;

    this.isLiveAnalysisLoading = false;

    switch (data.type) {
      case 'Init':
        console.log('Indicator analysis initialized:', data.message);
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
        // Pressure Down сигнал
        this.pressureDownActive = true;
        this.currentDropPercent = data.dropPercent?.replace('%', '') || '0';
        this.redCandlesCount = data.consecutiveCandles || 0;
        this.updatePressureIntensity(data);
        this.liveSignals.unshift(data);
        if (this.liveSignals.length > 50) this.liveSignals.pop();
        this.playAlertSound();
        break;
        
      case 'ReversalSignal':
        // Recovery Tracker почав роботу
        this.recoveryTrackerActive = true;
        this.recoveryPercent = '0';
        this.liveSignals.unshift(data);
        if (this.liveSignals.length > 50) this.liveSignals.pop();
        this.patternSignals.push({
          time: data.time,
          price: data.currentPrice || 0,
          reversalChance: data.reversalChance,
          indicatorType: 'Recovery Start'
        });
        this.playAlertSound();
        break;
        
      case 'ReversalUpdate':
        // Оновлення Recovery Tracker
        this.recoveryPercent = data.reversalPercent?.replace('%', '') || '0';
        this.fromStartPercent = data.fromStartPercent?.replace('%', '') || '0';
        this.updateRecoverySpeed(data);
        // Оновлюємо останній сигнал замість додавання нового
        const lastUpdateIndex = this.liveSignals.findIndex(s => s.type === 'ReversalUpdate');
        if (lastUpdateIndex >= 0) {
          this.liveSignals[lastUpdateIndex] = data;
        } else {
          this.liveSignals.unshift(data);
          if (this.liveSignals.length > 50) this.liveSignals.pop();
        }
        break;
        
      case 'ReversalComplete':
        // Завершення циклу індикаторів
        this.resetIndicatorStates();
        this.liveSignals.unshift(data);
        if (this.liveSignals.length > 50) this.liveSignals.pop();
        this.playAlertSound();
        break;
        
      case 'Error':
        console.error('Analysis error:', data.message);
        this.stopLiveAnalysis();
        alert(`Помилка аналізу: ${data.message}`);
        break;
    }
  }

  private updatePressureIntensity(data: ServerMessage): void {
    // Розрахунок інтенсивності на основі даних
    const drop = parseFloat(this.currentDropPercent);
    const candles = data.consecutiveCandles || 1;
    const intensity = (drop / candles * 10).toFixed(1);
    this.pressureIntensity = intensity;
  }

  private updateRecoverySpeed(data: ServerMessage): void {
    const recovery = parseFloat(this.recoveryPercent);
    const candles = data.candlesSinceReversal || 1;
    const speed = (recovery / candles).toFixed(2);
    this.recoverySpeed = speed;
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
    this.resetIndicatorStates();
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

    return periods[range]?.() || new Date(now.setMonth(now.getMonth() - 1));
  }

  parsePercentValue(value: string | number | undefined): number {
    if (value === undefined) return 0;

    if (typeof value === 'number') {
      return value;
    }

    return parseFloat(value.replace('%', ''));
  }
}