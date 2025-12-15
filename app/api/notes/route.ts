// app/api/notes/route.ts
import { createClient } from '@/utils/supabase/server'; // 서버용 클라이언트
import { NextResponse } from 'next/server';

// GET 요청 처리 (일기 불러오기)
export async function GET() {
  const supabase = await createClient();
  
  // 현재 사용자 정보 가져오기
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }
  
  // 현재 사용자의 노트만 가져오기
  const { data: notes } = await supabase.from('til_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  return NextResponse.json(notes);
}

// POST 요청 처리 (일기 저장하기)
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json(); // 프론트에서 보낸 데이터 받기

  // 현재 사용자 정보 가져오기
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 여기서 데이터 검증 (비어있는지 확인 등)
  if (!body.content) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 });
  }
  
  console.log('Content:', body.content);
  console.log('User ID:', user.id);
  console.log('User email:', user.email);
  
  // UUID 생성 (필요한 경우)
  const { randomUUID } = await import('crypto');
  
  // Supabase에 저장 (user_id 포함)
  const { data, error } = await supabase.from('til_notes').insert({ 
    id: randomUUID(), // UUID 직접 생성
    content: body.content,
    user_id: user.id 
  }).select();
  
  if (error) {
    console.error('Insert error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: '저장 중 오류가 발생했습니다: ' + error.message,
      errorCode: error.code,
      errorDetails: error.details 
    }, { status: 500 });
  }
  
  console.log('Insert success:', data);
  
  return NextResponse.json({ success: true });
}

// DELETE 요청 처리 (노트 삭제하기)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('id');

  // 현재 사용자 정보 가져오기
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // noteId 검증
  if (!noteId) {
    return NextResponse.json({ error: '노트 ID가 필요합니다' }, { status: 400 });
  }

  console.log('Deleting note:', { noteId, userId: user.id, noteIdType: typeof noteId });

  // 먼저 해당 노트가 존재하는지 확인
  const { data: existingNote } = await supabase
    .from('til_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  console.log('Existing note check:', existingNote);
  
  if (existingNote) {
    console.log('Note owner ID:', existingNote.user_id);
    console.log('Current user ID:', user.id);
    console.log('IDs match:', existingNote.user_id === user.id);
    console.log('Note owner type:', typeof existingNote.user_id);
    console.log('Current user type:', typeof user.id);
  }

  // 권한 확인: 노트가 존재하고 현재 사용자의 것인지 확인
  if (!existingNote) {
    return NextResponse.json({ 
      error: '삭제할 노트를 찾을 수 없습니다' 
    }, { status: 404 });
  }

  if (existingNote.user_id !== user.id) {
    return NextResponse.json({ 
      error: '이 노트를 삭제할 권한이 없습니다',
      debug: {
        noteOwner: existingNote.user_id,
        currentUser: user.id,
        match: existingNote.user_id === user.id
      }
    }, { status: 403 });
  }

  // 삭제 실행
  const { error } = await supabase
    .from('til_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ 
      error: '삭제 중 오류가 발생했습니다: ' + error.message 
    }, { status: 500 });
  }

  // 삭제 후 확인 (선택사항)
  const { data: checkNote } = await supabase
    .from('til_notes')
    .select('id')
    .eq('id', noteId)
    .single();

  if (checkNote) {
    console.log('Delete failed - note still exists');
    return NextResponse.json({ 
      error: '삭제가 완료되지 않았습니다' 
    }, { status: 500 });
  }

  // 삭제 성공
  console.log('Delete success for note:', noteId);
  return NextResponse.json({ 
    success: true, 
    message: '노트가 성공적으로 삭제되었습니다',
    deletedNoteId: noteId 
  });
}

// PUT 요청 처리 (노트 수정하기)
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('id');
  const body = await request.json();

  // 현재 사용자 정보 가져오기
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  // 데이터 검증
  if (!noteId) {
    return NextResponse.json({ error: '노트 ID가 필요합니다' }, { status: 400 });
  }

  if (!body.content) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 });
  }

  console.log('Updating note:', { noteId, userId: user.id, content: body.content });

  // 먼저 해당 노트가 존재하는지 확인
  const { data: existingNote } = await supabase
    .from('til_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  console.log('Existing note check for update:', existingNote);

  // 권한 확인: 노트가 존재하고 현재 사용자의 것인지 확인
  if (!existingNote) {
    return NextResponse.json({ 
      error: '수정할 노트를 찾을 수 없습니다' 
    }, { status: 404 });
  }

  if (existingNote.user_id !== user.id) {
    return NextResponse.json({ 
      error: '이 노트를 수정할 권한이 없습니다' 
    }, { status: 403 });
  }

  // 업데이트 실행
  const { error } = await supabase
    .from('til_notes')
    .update({ 
      content: body.content,
      updated_at: new Date().toISOString() // 수정 시간 업데이트 (컬럼이 있다면)
    })
    .eq('id', noteId);

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ 
      error: '수정 중 오류가 발생했습니다: ' + error.message 
    }, { status: 500 });
  }

  // 수정 성공
  console.log('Update success for note:', noteId);
  return NextResponse.json({ 
    success: true, 
    message: '노트가 성공적으로 수정되었습니다',
    updatedNoteId: noteId 
  });
}