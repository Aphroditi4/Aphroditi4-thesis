// crypro-data-service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface SelectItem {
  label: string;
  value: string;
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  time: string | Date;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class CryptoDataService {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getUsdtPairs(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/fetchusdtpairs`).pipe(
      catchError((error: unknown) => {
        console.error('Error fetching USDT pairs:', error);
        return throwError(() => new Error('Failed to fetch USDT pairs'));
      }),
      tap((data: string[]) => console.log('USDT pairs:', data))
    );
  }

  getCandlestickData(symbol: string | SelectItem, timeFrame: string | SelectItem, startDate: string, endDate?: string): Observable<CandleData[]> {
    const symbolValue = typeof symbol === 'object' && symbol?.value ? symbol.value : symbol as string;
    const timeFrameValue = typeof timeFrame === 'object' && timeFrame?.value ? timeFrame.value : timeFrame as string;

    const standardizeDate = (date: string) => date.includes('T') ? date.split('T')[0] : date;

    const normalizedStartDate = standardizeDate(startDate);
    const normalizedEndDate = endDate ? standardizeDate(endDate) : undefined;

    let params = new HttpParams()
      .set('symbol', symbolValue)
      .set('timeFrame', timeFrameValue)
      .set('startDate', normalizedStartDate);

    if (normalizedEndDate) {
      params = params.set('endDate', normalizedEndDate);
    }

    return this.http.get<CandleData[]>(`${this.baseUrl}/fetchcandlestickdata`, { params }).pipe(
      catchError((error: unknown) => {
        console.error('Error fetching candlestick data:', error);
        return throwError(() => new Error('Failed to fetch candlestick data'));
      }),
      tap((data: CandleData[]) => console.log(`Received ${data.length} candlesticks for ${symbolValue} (${timeFrameValue})`))
    );
  }

  getSixMonthsData(symbol: string | SelectItem, timeFrame: string | SelectItem): Observable<CandleData[]> {
    const symbolValue = typeof symbol === 'object' && symbol?.value ? symbol.value : symbol as string;
    const timeFrameValue = typeof timeFrame === 'object' && timeFrame?.value ? timeFrame.value : timeFrame as string;

    const params = new HttpParams().set('symbol', symbolValue).set('timeFrame', timeFrameValue);

    return this.http.get<CandleData[]>(`${this.baseUrl}/fetch6monthsdata`, { params }).pipe(
      catchError((error: unknown) => {
        console.error('Error fetching 6 months data:', error);
        return throwError(() => new Error('Failed to fetch 6 months data'));
      }),
      tap((data: CandleData[]) => console.log(`Six months data for ${symbolValue} (${timeFrameValue}):`, data))
    );
  }

  getPatternStatistics(symbol: string | SelectItem, timeFrame: string | SelectItem, config?: any): Observable<any[]> {
    const symbolValue = typeof symbol === 'object' && symbol?.value ? symbol.value : symbol as string;
    const timeFrameValue = typeof timeFrame === 'object' && timeFrame?.value ? timeFrame.value : timeFrame as string;

    const request = {
      symbol: symbolValue,
      timeFrame: timeFrameValue,
      config: config || {
        historyMonths: 6,
        minCandleCount: 3,
        maxCandleCount: 12,
        minDropThreshold: 0,
        recoveryPeriod: 10,
        topResultsCount: 20,
      },
    };

    return this.http.post<any[]>(`${this.baseUrl}/patternstatistics`, request).pipe(
      catchError((error: unknown) => {
        console.error('Error fetching pattern statistics:', error);
        return throwError(() => new Error('Failed to fetch pattern statistics'));
      }),
      tap((data: any[]) => console.log(`Pattern statistics for ${symbolValue} (${timeFrameValue}):`, data))
    );
  }

  // Замінюємо метод analyzeData на autoAnalyzeData
  autoAnalyzeData(symbol: string | SelectItem, timeFrame: string | SelectItem): Observable<any> {
    const symbolValue = typeof symbol === 'object' && symbol?.value ? symbol.value : symbol as string;
    const timeFrameValue = typeof timeFrame === 'object' && timeFrame?.value ? timeFrame.value : timeFrame as string;

    const params = new HttpParams()
      .set('symbol', symbolValue)
      .set('timeFrame', timeFrameValue);

    return this.http.get<any>(`${this.baseUrl}/autoanalyze`, { params }).pipe(
      catchError((error: unknown) => {
        console.error('Error during automated analysis:', error);
        return throwError(() => new Error('Failed to analyze patterns'));
      }),
      tap((data: any) => console.log('Automated analysis results:', data))
    );
  }

  // Збережений для сумісності
  analyzeData(
    priceData: any[],
    maxGreenCandles: number,
    minConsecutiveCandles: number,
    significantDropThreshold: number
  ): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/analyze`, {
      priceData,
      maxGreenCandles,
      minConsecutiveCandles,
      significantDropThreshold,
    }).pipe(
      catchError((error: unknown) => {
        console.error('Error analyzing data:', error);
        return throwError(() => new Error('Failed to analyze data'));
      }),
      tap((data: any) => console.log('Analysis result:', data))
    );
  }

  startLiveAnalysis(
    symbol: string | SelectItem,
    timeFrame: string | SelectItem,
    maxGreenCandles: number = 2,
    minConsecutiveCandles: number = 5,
    dropThreshold: number = 5
  ): Observable<any> {
    const symbolValue = typeof symbol === 'object' && symbol?.value ? symbol.value : symbol as string;
    const timeFrameValue = typeof timeFrame === 'object' && timeFrame?.value ? timeFrame.value : timeFrame as string;

    const params = new HttpParams()
      .set('symbol', symbolValue)
      .set('timeFrame', timeFrameValue)
      .set('maxGreenCandles', maxGreenCandles.toString())
      .set('minConsecutiveCandles', minConsecutiveCandles.toString())
      .set('dropThreshold', dropThreshold.toString());

    return this.http.get<any>(`${this.baseUrl}/streamlivedata`, { params }).pipe(
      catchError((error: unknown) => {
        console.error('Error starting live analysis:', error);
        return throwError(() => new Error('Failed to start live analysis'));
      }),
      tap(() => console.log(`Live analysis started for ${symbolValue} (${timeFrameValue})`))
    );
  }

  stopLiveAnalysis(symbol: string, timeFrame: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/stopliveanalysis`, { symbol, timeFrame }).pipe(
      catchError((error: unknown) => {
        console.error('Error stopping live analysis:', error);
        return throwError(() => new Error('Failed to stop live analysis'));
      }),
      tap((response) => console.log('Stop analysis response:', response))
    );
  }
}