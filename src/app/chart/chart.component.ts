// chart.component.ts
import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexXAxis,
  ApexYAxis,
  ApexTooltip,
  ApexStroke,
  ApexAnnotations,
  ApexMarkers,
  ChartComponent as ApexChartComponent,
} from 'ng-apexcharts';
import { NgApexchartsModule } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  annotations: ApexAnnotations;
  markers: ApexMarkers;
};

interface CandleData {
  x: number;
  y: number[];
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgApexchartsModule, CommonModule],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
})
export class ChartComponent implements OnChanges {
  @Input() chartData: { open: number; high: number; low: number; close: number; time: string | Date }[] = [];
  @Input() selectedSymbol: string = '';
  @Input() timeFrame: string = '1d';
  @Input() patternSignals: any[] = [];
  @Input() isLiveAnalysisRunning: boolean = false;
  @Input() refreshInterval: number = 10; // seconds, though not used directly here anymore

  @ViewChild('chart', { static: false }) chart!: ApexChartComponent;

  public chartOptions!: ChartOptions;
  private isChartInitialized: boolean = false;
  public isLoading: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ChartComponent ngOnChanges:', changes);

    if (changes['chartData'] || changes['patternSignals']) {
      this.updateChart();
    }

    if (changes['selectedSymbol'] || changes['timeFrame']) {
      this.initializeChart();
    }

    if (changes['isLiveAnalysisRunning'] && this.isLiveAnalysisRunning && this.isChartInitialized) {
      this.scrollToLatestCandle();
    }
  }

  private initializeChart(): void {
    if (!this.chartData || this.chartData.length === 0) {
      console.warn('No chart data provided');
      return;
    }

    this.isLoading = true;

    const validChartData = this.chartData.filter((point) => this.validateCandleData(point));
    if (validChartData.length === 0) {
      console.warn('No valid chart data to display');
      this.isLoading = false;
      return;
    }

    const seriesData: CandleData[] = validChartData.map((point) => ({
      x: this.getTimeInMilliseconds(point.time),
      y: [point.open, point.high, point.low, point.close],
    }));

    const annotations = {
      points: this.patternSignals.map((signal) => ({
        x: this.getTimeInMilliseconds(signal.time),
        y: signal.price,
        marker: {
          size: 6,
          fillColor: '#00E396',
          strokeColor: '#FFF',
          radius: 2,
        },
        label: {
          borderColor: '#FF4560',
          offsetY: 0,
          style: {
            color: '#fff',
            background: '#FF4560',
          },
          text: `Сигнал: ${signal.reversalChance || 'N/A'}`,
        },
      })),
    };

    this.chartOptions = {
      series: [
        {
          name: 'Candlestick',
          data: seriesData,
        },
      ],
      chart: {
        type: 'candlestick',
        height: 400,
        background: '#2a2a2a',
        foreColor: '#ffffff',
        animations: {
          enabled: false,
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: true,
        },
        events: {
          zoomed: () => this.optimizeChartRendering(),
          scrolled: () => this.optimizeChartRendering(),
          updated: () => {
            if (this.isLiveAnalysisRunning) {
              this.scrollToLatestCandle();
            }
          },
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: '#ffffff',
          },
          datetimeUTC: false,
          format: this.getDateFormatForTimeFrame(),
        },
      },
      yaxis: {
        tooltip: {
          enabled: true,
        },
        labels: {
          style: {
            colors: '#ffffff',
          },
          formatter: (value) => value.toFixed(2),
        },
      },
      stroke: {
        width: 1,
      },
      tooltip: {
        enabled: true,
        theme: 'dark',
        x: {
          format: 'dd MMM yyyy HH:mm',
        },
      },
      dataLabels: {
        enabled: false,
      },
      annotations: annotations,
      markers: {
        size: 0,
        colors: ['#FF4560', '#00E396'],
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: {
          size: 7,
        },
      },
    };

    this.isChartInitialized = true;
    this.isLoading = false;
  }

  private updateChart(): void {
    if (!this.chartData || this.chartData.length === 0 || !this.chart) {
      this.initializeChart();
      return;
    }

    this.isLoading = true;

    const validChartData = this.chartData.filter((point) => this.validateCandleData(point));
    const seriesData: CandleData[] = validChartData.map((point) => ({
      x: this.getTimeInMilliseconds(point.time),
      y: [point.open, point.high, point.low, point.close],
    }));

    const annotations = {
      points: this.patternSignals.map((signal) => ({
        x: this.getTimeInMilliseconds(signal.time),
        y: signal.price,
        marker: {
          size: 6,
          fillColor: '#00E396',
          strokeColor: '#FFF',
          radius: 2,
        },
        label: {
          borderColor: '#FF4560',
          offsetY: 0,
          style: {
            color: '#fff',
            background: '#FF4560',
          },
          text: `Сигнал: ${signal.reversalChance || 'N/A'}`,
        },
      })),
    };

    this.chart.updateSeries([{ name: 'Candlestick', data: seriesData }]);
    this.chart.updateOptions({ annotations });
    this.isLoading = false;

    if (this.isLiveAnalysisRunning) {
      this.scrollToLatestCandle();
    }
  }

  private validateCandleData(data: any): boolean {
    const isValid =
      data &&
      typeof data.open === 'number' &&
      typeof data.high === 'number' &&
      typeof data.low === 'number' &&
      typeof data.close === 'number' &&
      (typeof data.time === 'string' || data.time instanceof Date) &&
      !isNaN(this.getTimeInMilliseconds(data.time));

    if (!isValid) {
      console.warn('Invalid candle data:', data);
    }
    return isValid;
  }

  private getTimeInMilliseconds(time: string | Date): number {
    return typeof time === 'string' ? new Date(time).getTime() : time.getTime();
  }

  private optimizeChartRendering(): void {
    if (this.chart) {
      this.chart.updateOptions({
        chart: {
          animations: {
            enabled: false,
          },
        },
      });
    }
  }

  private scrollToLatestCandle(): void {
    if (this.chart && this.chartOptions?.series[0].data.length > 0) {
      const seriesData = this.chartOptions.series[0].data as CandleData[];
      const lastCandleTime = seriesData[seriesData.length - 1].x;
      const timeFrameMs = this.timeFrameToMilliseconds(this.timeFrame);
      const visibleCandles = 1000; // Кількість свічок для відображення
      const timeRange = timeFrameMs * visibleCandles;

      this.chart.zoomX(lastCandleTime - timeRange, lastCandleTime);
    }
  }

  private getDateFormatForTimeFrame(): string {
    switch (this.timeFrame) {
      case '1m':
      case '5m':
      case '15m':
        return 'HH:mm';
      case '1h':
      case '4h':
        return 'dd MMM HH:mm';
      case '1d':
        return 'dd MMM';
      default:
        return 'dd MMM';
    }
  }

  private timeFrameToMilliseconds(timeFrame: string): number {
    switch (timeFrame) {
      case '1m':
        return 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '15m':
        return 15 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
      case '4h':
        return 4 * 60 * 60 * 1000;
      case '1d':
        return 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}