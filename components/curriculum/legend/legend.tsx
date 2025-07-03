import { ConnectionColors } from '../connection/connection-colors';
import { SubjectColors } from './subject-colors';
import { LegendInstructions } from './legend-instructions';

interface LegendProps {
  showLegend: boolean;
}

export function Legend({ showLegend }: LegendProps) {
  if (!showLegend) return null;

  return (
    <div className="fixed bottom-20 left-4 p-4 rounded-lg shadow-lg border border-gray-600 z-40 max-w-sm" style={{ backgroundColor: '#21262d' }}>
      <h3 className="font-semibold text-sm mb-3 text-white">Leyenda</h3>
      
      <ConnectionColors />
      <SubjectColors />
      <LegendInstructions />
    </div>
  );
} 