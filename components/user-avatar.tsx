'use client';

import Image from 'next/image';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

// Deterministic color from a string so the same user always gets the same color
const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
];

function colorFor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function UserAvatar({ name, email, image, size = 32 }: UserAvatarProps) {
  const initials = getInitials(name, email);
  const color = colorFor(name || email || '?');

  if (image) {
    return (
      <Image
        src={image}
        alt={name || email || 'User avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={`${color} text-white rounded-full flex items-center justify-center font-semibold select-none`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
