import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
  score: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  // Determine color based on score
  let fill = '#10B981'; // Green
  if (score >= 40) fill = '#F59E0B'; // Yellow
  if (score >= 70) fill = '#DC2626'; // Red (Stronger Red)

  // Background color for the track
  const trackFill = '#E2E8F0';

  const data = [{ name: 'Risk', value: score, fill: fill }];

  return (
    <div className="relative h-56 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="70%" 
          innerRadius="65%" 
          outerRadius="100%" 
          barSize={24} 
          data={data} 
          startAngle={180} 
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: trackFill }}
            dataKey="value"
            cornerRadius={12}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-5xl font-black tracking-tighter drop-shadow-sm" style={{ color: fill }}>
          {score}
        </div>
        <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
          위험도
        </div>
      </div>
    </div>
  );
};

export default RiskGauge;