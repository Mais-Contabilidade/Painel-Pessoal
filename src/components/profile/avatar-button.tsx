"use client";

import { useState } from "react";
import { Avatar } from "@/components/profile/avatar";
import { ProfileSheet } from "@/components/profile/profile-sheet";

export function AvatarButton({ size = 32 }: { size?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir perfil"
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar size={size} />
      </button>
      {open && <ProfileSheet onClose={() => setOpen(false)} />}
    </>
  );
}
