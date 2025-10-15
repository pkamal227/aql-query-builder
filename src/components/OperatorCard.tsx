import { Video as LucideIcon } from 'lucide-react';

interface OperatorCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

export default function OperatorCard({ icon: Icon, title, description, onClick, color }: OperatorCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg ${color} text-white hover:opacity-90 transition-opacity shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs opacity-90 mt-0.5">{description}</div>
        </div>
      </div>
    </button>
  );
}
