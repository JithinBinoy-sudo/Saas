import { UploadDropzone } from '@/components/upload/UploadDropzone';

export const metadata = { title: 'Portlio — Upload Reservations' };

export default function UploadPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Upload reservations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Drop a reservation Excel export. We&apos;ll map columns using your saved onboarding
          mapping, validate each row, and insert or update your data.
        </p>
      </header>
      <UploadDropzone />
    </div>
  );
}
