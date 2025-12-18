import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken, createKISHeaders } from '@/utils/kis-config';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { sellPrice, symbol, quantity } = await request.json();
    const orderId = params.id;

    // 입력값 검증
    if (!sellPrice || sellPrice <= 0) {
      return NextResponse.json(
        { error: '매도가격은 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    if (!symbol || !quantity) {
      return NextResponse.json(
        { error: '종목코드와 수량 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // KIS 설정 가져오기
    const kisConfig = await getKISConfig(user.id);
    if (!kisConfig) {
      return NextResponse.json({
        error: 'KIS API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // KIS 액세스 토큰 발급
    const accessToken = await getKISAccessToken(kisConfig, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 주문 정정 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC0803U'; // 주식주문(정정취소) TR_ID

    const modifyData = {
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'KRX_FWDG_ORD_ORGNO': '', // 한국거래소전송주문조직번호
      'ORGN_ODNO': orderId, // 원주문번호
      'ORD_DVSN': '00', // 주문구분 (00: 지정가)
      'RVSE_CNCL_DVSN_CD': '01', // 정정취소구분코드 (01: 정정)
      'ORD_QTY': '0', // 주문수량 (정정 시 0)
      'ORD_UNPR': sellPrice.toString(), // 주문단가
      'QTY_ALL_ORD_YN': 'Y', // 잔량전부주문여부 (Y: 잔량전부)
    };

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-rvsecncl`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(modifyData),
      }
    );

    if (!response.ok) {
      console.error('KIS 주문 정정 실패:', response.status);
      return NextResponse.json({
        error: 'KIS API 주문 정정에 실패했습니다'
      }, { status: 400 });
    }

    const data = await response.json();

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      return NextResponse.json({
        error: `주문 정정 실패: ${data.msg1}`
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '매도 주문이 수정되었습니다',
      newOrderId: data.output?.ODNO || orderId
    });
  } catch (error) {
    console.error('매도 주문 수정 실패:', error);
    return NextResponse.json(
      { error: '매도 주문 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}

// 주문 취소 API
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const orderId = params.id;

    // KIS 설정 가져오기
    const kisConfig = await getKISConfig(user.id);
    if (!kisConfig) {
      return NextResponse.json({
        error: 'KIS API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // KIS 액세스 토큰 발급
    const accessToken = await getKISAccessToken(kisConfig, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 주문 취소 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC0803U'; // 주식주문(정정취소) TR_ID

    const cancelData = {
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'KRX_FWDG_ORD_ORGNO': '', // 한국거래소전송주문조직번호
      'ORGN_ODNO': orderId, // 원주문번호
      'ORD_DVSN': '00', // 주문구분
      'RVSE_CNCL_DVSN_CD': '02', // 정정취소구분코드 (02: 취소)
      'ORD_QTY': '0', // 주문수량
      'ORD_UNPR': '0', // 주문단가
      'QTY_ALL_ORD_YN': 'Y', // 잔량전부주문여부
    };

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-rvsecncl`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(cancelData),
      }
    );

    if (!response.ok) {
      console.error('KIS 주문 취소 실패:', response.status);
      return NextResponse.json({
        error: 'KIS API 주문 취소에 실패했습니다'
      }, { status: 400 });
    }

    const data = await response.json();

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      return NextResponse.json({
        error: `주문 취소 실패: ${data.msg1}`
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '매도 주문이 취소되었습니다'
    });
  } catch (error) {
    console.error('매도 주문 취소 실패:', error);
    return NextResponse.json(
      { error: '매도 주문 취소에 실패했습니다' },
      { status: 500 }
    );
  }
}