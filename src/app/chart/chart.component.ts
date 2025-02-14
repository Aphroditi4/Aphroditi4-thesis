import { Component, Input, OnInit } from '@angular/core';
import { CanvasJS } from '@canvasjs/angular-charts';

@Component({
  selector: 'app-chart',
  standalone: true, 
  imports: [],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
})
export class ChartComponent implements OnInit {
  @Input() chartData: any[] = [];
  @Input() selectedSymbol: string = '';
  @Input() timeFrame: string = '1d';

  chartOptions: any;

  ngOnInit(): void {
    this.initializeChart();
  }

  initializeChart() {
    const dateFormat = this.getDateFormat(this.timeFrame);

    this.chartOptions = {
      backgroundColor: '#2B2B2B',
      exportEnabled: true,
      title: {
        text: `${this.selectedSymbol} Price`,
        fontColor: '#FFFFFF',
      },
      axisX: {
        valueFormatString: dateFormat,
        labelFontColor: '#FFFFFF',
        lineColor: '#FFFFFF',
      },
      axisY: {
        title: 'Price in USD',
        prefix: '$',
        labelFontColor: '#FFFFFF',
        lineColor: '#FFFFFF',
      },
      data: [
        {
          type: 'candlestick',
          risingColor: '#00FF00',
          fallingColor: '#FF0000',
          dataPoints: this.chartData,
        },
      ],
    };

    setTimeout(() => {
      const chart = new CanvasJS.Chart('chartContainer', this.chartOptions);
      chart.render();
    }, 0);
  }

  getDateFormat(timeFrame: string): string {
    if (timeFrame.includes('m')) return 'HH:mm DD MMM YYYY';
    if (timeFrame.includes('h')) return 'HH:mm DD MMM YYYY';
    if (timeFrame.includes('d') || timeFrame.includes('w')) return 'DD MMM YYYY';
    if (timeFrame.includes('M')) return 'MMM YYYY';
    return 'DD MMM YYYY';
  }
}