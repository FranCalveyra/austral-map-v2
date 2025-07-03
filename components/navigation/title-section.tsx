interface TitleSectionProps {
  studentName?: string;
}

export function TitleSection({ studentName }: TitleSectionProps) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">
        Plan de Estudios
      </h1>
      <p className="text-sm text-gray-300">
        {studentName ? `Estudiante: ${studentName}` : 'Visualizador de Plan de Estudios'}
      </p>
    </div>
  );
} 