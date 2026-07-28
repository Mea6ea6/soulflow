import { useMemo } from 'react';

const PALETTE = ['#4A6D8C', '#C0925F', '#7D6289', '#4C9A6A', '#B07A6C', '#5A87A6', '#8A6B4F', '#6B7280'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  photoBase64?: string | null;
  size?: number;
}

export default function Avatar({ name, photoBase64, size = 40 }: AvatarProps) {
  const initials = useMemo(() => getInitials(name || '?'), [name]);
  const bgColor = useMemo(() => getColorForName(name || '?'), [name]);

  if (photoBase64) {
    return (
      <img
        src={`data:image/jpeg;base64,${photoBase64}`}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.38 }}
      className="rounded-full flex items-center justify-center text-white font-medium shrink-0 font-display"
    >
      {initials}
    </div>
  );
}