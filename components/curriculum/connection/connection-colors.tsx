interface ConnectionColorItemProps {
  color: string;
  label: string;
}

function ConnectionColorItem({ color, label }: ConnectionColorItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-1 ${color} relative`}>
        <div className={`absolute right-0 top-0 w-0 h-0 border-l-[4px] border-l-current border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent`}></div>
      </div>
      <span className="text-gray-300">{label}</span>
    </div>
  );
}

export function ConnectionColors() {
  const connectionColors = [
    { color: 'bg-green-500', label: 'Materia Aprobada' },
    { color: 'bg-blue-500', label: 'Materia Cursando' },
    { color: 'bg-yellow-500', label: 'Materia En Final' },
    { color: 'bg-red-500', label: 'Materia Desaprobada' },
    { color: 'bg-gray-400', label: 'Sin Estado/Disponible' },
  ];

  return (
    <div className="space-y-2 text-xs mb-4">
      <h4 className="font-medium text-gray-300 mb-2">Estados de Correlatividades:</h4>
      {connectionColors.map((item, index) => (
        <ConnectionColorItem key={index} color={item.color} label={item.label} />
      ))}
    </div>
  );
} 