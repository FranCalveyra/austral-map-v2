interface TitleSectionProps {
  studentName?: string;
  planName?: string;
}

export function TitleSection({ studentName, planName }: TitleSectionProps) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">
        {planName ?? 'Plan de Estudios'}
      </h1>
      <p className="text-sm text-gray-300">
        {studentName ? `Estudiante: ${studentName}` : 'Visualizador de Plan de Estudios'}
      </p>
    </div>
  );
} 