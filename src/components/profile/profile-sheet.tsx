"use client";

import { useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/profile/avatar";
import { useProfileStore } from "@/store/profile-store";
import { useSupabase } from "@/lib/supabase-provider";

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const supabase = useSupabase();
  const profile = useProfileStore((s) => s.profile);
  const avatarSignedUrl = useProfileStore((s) => s.avatarSignedUrl);
  const uploadAvatar = useProfileStore((s) => s.uploadAvatar);
  const removeAvatar = useProfileStore((s) => s.removeAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = Boolean(avatarSignedUrl ?? profile?.avatarUrl);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    setBusy(true);
    setError(null);
    try {
      await uploadAvatar(supabase, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      await removeAvatar(supabase);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a foto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Perfil">
      <div className="flex flex-col items-center gap-4 py-2">
        <Avatar size={72} />
        <div className="text-center">
          <p className="text-[14px] font-medium text-text">{profile?.displayName || profile?.email}</p>
          {profile?.displayName && <p className="text-[12.5px] text-text-muted">{profile.email}</p>}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="flex w-full gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Trocar foto
          </Button>
          {hasPhoto && (
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={handleRemove}>
              Remover foto
            </Button>
          )}
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
