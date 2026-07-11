interface TitleSectionProps {
  careerName?: string;
  planName?: string;
  studentName?: string;
}

export function TitleSection({ careerName, planName, studentName }: TitleSectionProps) {
  const title = careerName ?? 'Plan de Estudios';

  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-bold text-white">
        {title}
      </h1>
      {studentName ? (
        <p className="truncate text-sm text-gray-300">
          Alumno: {studentName}
        </p>
      ) : null}
      {planName ? (
        <p className="truncate text-xs text-gray-400">
          Plan: {planName}
        </p>
      ) : null}
      {!studentName && !planName ? (
        <p className="truncate text-sm text-gray-300">
          Visualizador de Plan de Estudios
        </p>
      ) : null}
    </div>
  );
}
