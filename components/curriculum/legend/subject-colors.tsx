interface SubjectColorItemProps {
  color: string;
  borderColor: string;
  label: string;
}

function SubjectColorItem({ color, borderColor, label }: SubjectColorItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 ${color} ${borderColor} rounded`}></div>
      <span className="text-gray-300">{label}</span>
    </div>
  );
}

export function SubjectColors() {
  const subjectColors = [
    { color: 'bg-green-100', borderColor: 'border border-green-300', label: 'Aprobada' },
    { color: 'bg-blue-100', borderColor: 'border border-blue-300', label: 'Cursando' },
    { color: 'bg-yellow-100', borderColor: 'border border-yellow-300', label: 'En Final' },
    { color: 'bg-red-100', borderColor: 'border border-red-300', label: 'Desaprobada' },
    { color: 'bg-gray-700', borderColor: 'border border-gray-500', label: 'Disponible' },
    { color: 'bg-gray-800', borderColor: 'border border-gray-600', label: 'No Disponible' },
  ];

  return (
    <div className="space-y-2 text-xs mb-4">
      <h4 className="font-medium text-gray-300 mb-2">Estados de Materias:</h4>
      {subjectColors.map((item, index) => (
        <SubjectColorItem 
          key={index} 
          color={item.color} 
          borderColor={item.borderColor} 
          label={item.label} 
        />
      ))}
    </div>
  );
} 