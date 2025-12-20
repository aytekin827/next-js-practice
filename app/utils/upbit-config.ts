import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export interface UpbitConfig {
  accessKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * 사용자의 Upbit 설정을 DB에서 가져옵니다
 */
export async function getUpbitConfig(userId: string): Promise<UpbitConfig | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('upbit_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Upbit 설정을 찾을 수 없습니다:', error);
      return null;
    }

    // 필수 설정값이 모두 있는지 확인
    if (!data.access_key || !data.secret_key) {
      console.error('Upbit 설정이 불완전합니다');
      return null;
    }

    return {
      accessKey: data.access_key,
      secretKey: data.secret_key,
      baseUrl: data.base_url || 'https://api.upbit.com'
    };
  } catch (error) {
    console.error('Upbit 설정 조회 중 오류:', error);
    return null;
  }
}

/**
 * Upbit API 호출을 위한 JWT 토큰을 생성합니다
 */
export function createUpbitJWT(config: UpbitConfig, query?: Record<string, any>): string {
  const jwt = require('jsonwebtoken');
  
  const payload: Record<string, any> = {
    access_key: config.accessKey,
    nonce: Date.now().toString(),
  };

  if (query) {
    const queryString = new URLSearchParams(query).toString();
    const hash = crypto.createHash('sha512');
    hash.update(queryString, 'utf-8');
    
    payload['query_hash'] = hash.digest('hex');
    payload['query_hash_alg'] = 'SHA512';
  }

  const token = jwt.sign(payload, config.secretKey);
  return token;
}

/**
 * Upbit API 호출을 위한 공통 헤더를 생성합니다
 */
export function createUpbitHeaders(config: UpbitConfig, query?: Record<string, any>) {
  const token = createUpbitJWT(config, query);
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Upbit 마켓 코드 유효성 검사
 */
export function validateMarketCode(market: string): boolean {
  // KRW-BTC, BTC-ETH 등의 형식 검증
  const marketPattern = /^[A-Z]{3,4}-[A-Z]{2,10}$/;
  return marketPattern.test(market);
}

/**
 * Upbit API 에러 처리
 */
export function handleUpbitError(error: any): string {
  if (error.error) {
    switch (error.error.name) {
      case 'invalid_access_key':
        return 'Upbit Access Key가 유효하지 않습니다';
      case 'jwt_verification':
        return 'Upbit JWT 토큰 검증에 실패했습니다';
      case 'invalid_query_payload':
        return 'Upbit API 요청 파라미터가 올바르지 않습니다';
      case 'market_does_not_exist':
        return '존재하지 않는 마켓입니다';
      case 'insufficient_funds':
        return '잔고가 부족합니다';
      case 'order_not_found':
        return '주문을 찾을 수 없습니다';
      default:
        return error.error.message || 'Upbit API 오류가 발생했습니다';
    }
  }
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * 원화 마켓 여부 확인
 */
export function isKRWMarket(market: string): boolean {
  return market.startsWith('KRW-');
}

/**
 * 가격 포맷팅 (원화 마켓용)
 */
export function formatKRWPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price);
}

/**
 * 코인 수량 포맷팅
 */
export function formatCoinAmount(amount: number, precision: number = 8): string {
  return parseFloat(amount.toFixed(precision)).toString();
}