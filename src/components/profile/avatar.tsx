"use client";

import Image from "next/image";
import { useProfileStore } from "@/store/profile-store";

function getInitials(profile: { displayName: string | null; email: string } | null): string {
  if (!profile) return "JS";
  const source = profile.displayName?.trim() || profile.email;
  if (!source) return "JS";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function Avatar({ size = 32 }: { size?: number }) {
  const profile = useProfileStore((s) => s.profile);
  const avatarSignedUrl = useProfileStore((s) => s.avatarSignedUrl);
  const src = avatarSignedUrl ?? profile?.avatarUrl ?? null;

  if (src) {
    return (
      <Image
        src={src}
        alt="Foto de perfil"
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {getInitials(profile)}
    </span>
  );
}
