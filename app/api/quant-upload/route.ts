import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface QuantumStock {
  종목명: string;
  종목코드: string;
  종가: number;
  시가총액: number;
  거래량: number;
  거래대금: number;
  상장주식수: number;
  시장: string;
  BPS: number;
  PER: number;
  PBR: number;
  EPS: number;
  DIV: number;
  DPS: number;
  mom_3m: number;
  mom_12m: number;
  value_score: number;
  quality_score: number;
  momentum_score: number;
  risk_score: number;
  total_score: number;
  시총구간: string;
  리스크구간: string;
  스타일: string;
}

// CSV 파싱 함수
function parseCSV(csvText: string): QuantumStock[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV 파일이 비어있거나 헤더가 없습니다.');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const expectedHeaders = [
    '종목명', '종목코드', '종가', '시가총액', '거래량', '거래대금', '상장주식수', '시장',
    'BPS', 'PER', 'PBR', 'EPS', 'DIV', 'DPS', 'mom_3m', 'mom_12m',
    'value_score', 'quality_score', 'momentum_score', 'risk_score', 'total_score',
    '시총구간', '리스크구간', '스타일'
  ];

  // 헤더 검증
  const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`필수 컬럼이 누락되었습니다: ${missingHeaders.join(', ')}`);
  }

  const stocks: QuantumStock[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      console.warn(`라인 ${i + 1}: 컬럼 수가 맞지 않습니다. 건너뜁니다.`);
      continue;
    }

    try {
      const stock: QuantumStock = {
        종목명: values[headers.indexOf('종목명')] || '',
        종목코드: values[headers.indexOf('종목코드')] || '',
        종가: parseFloat(values[headers.indexOf('종가')]) || 0,
        시가총액: parseFloat(values[headers.indexOf('시가총액')]) || 0,
        거래량: parseFloat(values[headers.indexOf('거래량')]) || 0,
        거래대금: parseFloat(values[headers.indexOf('거래대금')]) || 0,
        상장주식수: parseFloat(values[headers.indexOf('상장주식수')]) || 0,
        시장: values[headers.indexOf('시장')] || '',
        BPS: parseFloat(values[headers.indexOf('BPS')]) || 0,
        PER: parseFloat(values[headers.indexOf('PER')]) || 0,
        PBR: parseFloat(values[headers.indexOf('PBR')]) || 0,
        EPS: parseFloat(values[headers.indexOf('EPS')]) || 0,
        DIV: parseFloat(values[headers.indexOf('DIV')]) || 0,
        DPS: parseFloat(values[headers.indexOf('DPS')]) || 0,
        mom_3m: parseFloat(values[headers.indexOf('mom_3m')]) || 0,
        mom_12m: parseFloat(values[headers.indexOf('mom_12m')]) || 0,
        value_score: parseFloat(values[headers.indexOf('value_score')]) || 0,
        quality_score: parseFloat(values[headers.indexOf('quality_score')]) || 0,
        momentum_score: parseFloat(values[headers.indexOf('momentum_score')]) || 0,
        risk_score: parseFloat(values[headers.indexOf('risk_score')]) || 0,
        total_score: parseFloat(values[headers.indexOf('total_score')]) || 0,
        시총구간: values[headers.indexOf('시총구간')] || '',
        리스크구간: values[headers.indexOf('리스크구간')] || '',
        스타일: values[headers.indexOf('스타일')] || '',
      };

      // 기본 검증
      if (!stock.종목명 || !stock.종목코드) {
        console.warn(`라인 ${i + 1}: 종목명 또는 종목코드가 없습니다. 건너뜁니다.`);
        continue;
      }

      stocks.push(stock);
    } catch (error) {
      console.warn(`라인 ${i + 1} 파싱 오류:`, error);
      continue;
    }
  }

  return stocks;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('csvFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'CSV 파일이 업로드되지 않았습니다' }, { status: 400 });
    }

    // 파일 타입 검증
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'CSV 파일만 업로드 가능합니다' }, { status: 400 });
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다' }, { status: 400 });
    }

    // CSV 파일 읽기
    const csvText = await file.text();

    // CSV 파싱
    const stocks = parseCSV(csvText);

    if (stocks.length === 0) {
      return NextResponse.json({ error: '유효한 종목 데이터가 없습니다' }, { status: 400 });
    }

    // total_score 기준으로 정렬
    stocks.sort((a, b) => b.total_score - a.total_score);

    return NextResponse.json({
      success: true,
      message: `${stocks.length}개 종목 데이터를 성공적으로 로드했습니다`,
      data: stocks
    });

  } catch (error) {
    console.error('CSV 업로드 처리 실패:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다'
    }, { status: 500 });
  }
}