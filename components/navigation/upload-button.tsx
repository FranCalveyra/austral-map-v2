import { Upload } from 'lucide-react';

interface UploadButtonProps {
  onFileUpload: (file: File) => void;
}

export function UploadButton({ onFileUpload }: UploadButtonProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".xls,.xlsx"
        onChange={handleFileUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
      >
        <Upload className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Subir plan de estudios</span>
      </label>
    </div>
  );
} 