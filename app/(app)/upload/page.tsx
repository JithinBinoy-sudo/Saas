import { CloudUpload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { UploadDropzone } from '@/components/upload/UploadDropzone';

export const metadata = { title: 'Portlio · Upload Reservations' };

export default function UploadPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="p-8">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CloudUpload className="h-6 w-6" />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Upload Data File</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop a reservations export to populate your portfolio.
          </p>
        </div>
        <UploadDropzone redirectOnSuccessTo="/" />
      </Card>
    </div>
  );
}
