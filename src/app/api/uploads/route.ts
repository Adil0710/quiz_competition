import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const folder = (form.get('folder') as string) || 'quiz-media';

    // Collect files from keys: file, files, file1, file2, etc.
    const files: File[] = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof File && key.toLowerCase().startsWith('file')) {
        if (value.size > 0) files.push(value);
      }
      // Support "files" key as well
      if (key.toLowerCase() === 'files') {
        const v = form.getAll(key).filter((it) => it instanceof File) as File[];
        v.forEach((f) => { if (f.size > 0) files.push(f); });
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    const uploaded: any[] = [];
    for (const file of files) {
      const res: any = await uploadToCloudinary(file, folder);
      uploaded.push({
        url: res.secure_url,
        public_id: res.public_id,
        resource_type: res.resource_type,
        format: res.format,
        bytes: res.bytes,
        width: res.width,
        height: res.height,
        duration: (res as any).duration,
      });
    }

    return NextResponse.json({ success: true, count: uploaded.length, files: uploaded });
  } catch (e: any) {
    console.error('Upload error', e);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
