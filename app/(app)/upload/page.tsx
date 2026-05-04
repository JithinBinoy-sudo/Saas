import { UploadDropzone } from '@/components/upload/UploadDropzone';

export const metadata = { title: 'Portlio — Upload Reservations' };

export default function UploadPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="mx-auto w-full max-w-[42rem] rounded-[36px] border border-white/[0.04] bg-[#121214] p-8 sm:p-10 shadow-[0px_40px_80px_rgba(0,0,0,0.6)]">
        
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <span className="material-symbols-outlined text-[28px] text-[#85ADFF]">
            cloud_upload
          </span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-white">
            Upload Data File
          </h1>
        </div>

        <UploadDropzone redirectOnSuccessTo="/" />
      </div>
    </div>
  );
}
