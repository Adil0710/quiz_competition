import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import * as XLSX from 'xlsx';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const PHASES = new Set(['league', 'semi_final', 'final']);

function toNumber(val: any, def = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

function normalizeDifficulty(raw: any) {
  const v = String(raw || '').toLowerCase().trim();
  return DIFFICULTIES.has(v) ? (v as 'easy'|'medium'|'hard') : 'medium';
}

function normalizePhase(raw: any) {
  const v = String(raw || '').toLowerCase().trim();
  if (v === 'group') return 'league';
  return PHASES.has(v) ? (v as 'league'|'semi_final'|'final') : 'league';
}

function parseCorrectForMcq(val: any, options: string[]) {
  const str = String(val || '').trim();
  if (!str) return null;
  const mapABCD: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
  const byLetter = mapABCD[str.toLowerCase()];
  if (typeof byLetter === 'number' && options[byLetter]) return byLetter;
  const num = Number(str);
  if (Number.isInteger(num) && num >= 1 && num <= options.length) return num - 1;
  const idx = options.findIndex(o => o.trim().toLowerCase() === str.toLowerCase());
  if (idx >= 0) return idx;
  return null;
}

function parseCorrectSequence(val: any, optionCount: number) {
  const str = String(val || '').trim();
  if (!str) return null;
  const parts = str.split(',').map(s => Number(String(s).trim()));
  if (!parts.every(n => Number.isInteger(n) && n >= 1 && n <= optionCount)) return null;
  // ensure permutation
  const set = new Set(parts);
  if (set.size !== optionCount) return null;
  return parts.map(n => n - 1);
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const type = (form.get('type') as string | null)?.toLowerCase();

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }
    if (!type || !['mcq', 'buzzer', 'sequence'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type. Must be mcq | buzzer | sequence' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return NextResponse.json({ success: false, error: 'Empty workbook' }, { status: 400 });

    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const errors: { row: number; message: string }[] = [];
    const toInsert: any[] = [];

    const requiredByType: Record<string, string[]> = {
      mcq: ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Category', 'Difficulty', 'Points', 'Phase'],
      buzzer: ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Category', 'Difficulty', 'Points', 'Phase'],
      sequence: ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Sequence', 'Category', 'Difficulty', 'Points', 'Phase'],
    };

    // header validation
    const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
    const missing = requiredByType[type].filter(col => !headerRow?.includes(col));
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing columns: ${missing.join(', ')}` }, { status: 400 });
    }

    rows.forEach((row, idx) => {
      const excelRow = idx + 2; // considering header at row 1
      try {
        const common = {
          category: String(row['Category'] || '').trim(),
          difficulty: normalizeDifficulty(row['Difficulty']),
          points: toNumber(row['Points'], 1),
          phase: normalizePhase(row['Phase']),
        };
        if (!common.category) throw new Error('Category is required');
        if (common.points <= 0) throw new Error('Points must be > 0');

        if (type === 'mcq') {
          const question = String(row['Question'] || '').trim();
          const opts = [row['Option A'], row['Option B'], row['Option C'], row['Option D']].map((v:any)=>String(v||'').trim());
          const corrRaw = row['Correct'];
          if (!question) throw new Error('Question is required');
          if (opts.filter(o=>!!o).length < 2) throw new Error('At least two options required');
          const correctIndex = parseCorrectForMcq(corrRaw, opts);
          if (correctIndex === null) throw new Error('Invalid Correct value');

          toInsert.push({
            question,
            type: 'mcq',
            options: opts,
            correctAnswer: correctIndex,
            difficulty: common.difficulty,
            category: common.category,
            points: common.points,
            phase: common.phase,
            isUsed: false,
          });
        } else if (type === 'buzzer') {
          const question = String(row['Question'] || '').trim();
          const opts = [row['Option A'], row['Option B'], row['Option C'], row['Option D']].map((v:any)=>String(v||'').trim());
          const corrRaw = row['Correct'];
          if (!question) throw new Error('Question is required');
          if (opts.filter(o=>!!o).length < 2) throw new Error('At least two options required');
          const correctAnswer = parseCorrectForMcq(corrRaw, opts);
          if (correctAnswer === null) throw new Error('Invalid Correct value');
          toInsert.push({
            question,
            type: 'buzzer',
            options: opts,
            correctAnswer: opts[correctAnswer], // Store as string (the actual option text)
            difficulty: common.difficulty,
            category: common.category,
            points: common.points,
            phase: common.phase,
            isUsed: false,
          });
        } else if (type === 'sequence') {
          const question = String(row['Question'] || '').trim();
          const opts = [row['Option 1'], row['Option 2'], row['Option 3'], row['Option 4']].map((v:any)=>String(v||'').trim());
          const corrSeqRaw = row['Correct Sequence'];
          if (!question) throw new Error('Question is required');
          if (opts.filter(o=>!!o).length < 3) throw new Error('At least three options required');
          const corr = parseCorrectSequence(corrSeqRaw, opts.length);
          if (!corr) throw new Error('Invalid Correct Sequence');
          toInsert.push({
            question,
            type: 'sequence',
            options: opts,
            correctAnswer: corr,
            difficulty: common.difficulty,
            category: common.category,
            points: common.points,
            phase: common.phase,
            isUsed: false,
          });
        }
      } catch (e:any) {
        errors.push({ row: excelRow, message: e.message || 'Invalid row' });
      }
    });

    if (toInsert.length) {
      await Question.insertMany(toInsert);
    }

    return NextResponse.json({ success: true, created: toInsert.length, errors });
  } catch (e:any) {
    console.error('Import error', e);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
