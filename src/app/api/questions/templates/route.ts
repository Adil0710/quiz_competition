import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

function makeWorkbook(type: 'mcq'|'buzzer'|'sequence') {
  const headerByType: Record<typeof type, string[]> = {
    mcq: ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Category', 'Difficulty', 'Points', 'Phase'],
    buzzer: ['Question', 'Answer', 'Category', 'Difficulty', 'Points', 'Phase'],
    sequence: ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Sequence', 'Category', 'Difficulty', 'Points', 'Phase'],
  } as const;

  const sampleRowByType: Record<typeof type, any> = {
    mcq: {
      'Question': 'What is the capital of France?',
      'Option A': 'Paris',
      'Option B': 'Berlin',
      'Option C': 'Madrid',
      'Option D': 'Rome',
      'Correct': 'A',
      'Category': 'Geography',
      'Difficulty': 'easy',
      'Points': 10,
      'Phase': 'league',
    },
    buzzer: {
      'Question': '2 + 2 = ?',
      'Answer': '4',
      'Category': 'Math',
      'Difficulty': 'easy',
      'Points': 10,
      'Phase': 'league',
    },
    sequence: {
      'Question': 'Arrange planets by distance from the Sun (nearest first)',
      'Option 1': 'Mercury',
      'Option 2': 'Venus',
      'Option 3': 'Earth',
      'Option 4': 'Mars',
      'Correct Sequence': '1,2,3,4',
      'Category': 'Astronomy',
      'Difficulty': 'medium',
      'Points': 20,
      'Phase': 'final',
    },
  } as const;

  const ws = XLSX.utils.json_to_sheet([headerByType[type], sampleRowByType[type]], { skipHeader: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());
  return wb;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') || '').toLowerCase() as 'mcq'|'buzzer'|'sequence';
  if (!['mcq','buzzer','sequence'].includes(type)) {
    return NextResponse.json({ success: false, error: 'type query must be mcq | buzzer | sequence' }, { status: 400 });
  }

  const wb = makeWorkbook(type);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `${type}_template.xlsx`;
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
