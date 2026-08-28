"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction, type ProfileFormState } from "@/app/(dashboard)/profile/actions";
import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const initialState: ProfileFormState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [state, formAction] = useFormState(updateProfileAction, initialState);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        alert("Error uploading avatar: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-lg">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt={profile.full_name} className="w-16 h-16 rounded-full object-cover border border-outline-variant" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-md font-medium">
            {profile.full_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-headline-lg text-on-surface">{profile.full_name}</h2>
          <p className="text-body-sm text-on-surface-variant capitalize">{profile.role.replace("_", " ")}</p>
        </div>
      </div>

      <form action={formAction} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
        {state.error && (
          <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">{state.error}</div>
        )}
        {state.success && (
          <div className="rounded-lg bg-secondary-container/30 text-secondary text-body-sm px-sm py-2">Saved.</div>
        )}

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Avatar Image</label>
          <div className="flex items-center gap-md">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="px-md py-sm rounded-lg border border-outline text-label-md hover:bg-surface-container-low transition-colors cursor-pointer inline-block"
              >
                {uploading ? "Uploading..." : "Upload New Picture"}
              </label>
            </div>
          </div>
          <input type="hidden" name="avatarUrl" value={avatarUrl ?? ""} />
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Full Name</label>
          <input
            name="fullName"
            defaultValue={profile.full_name}
            required
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
          />
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Email</label>
          <input
            value={email}
            disabled
            className="w-full h-10 px-md bg-surface-container border border-outline-variant rounded-lg text-body-sm text-on-surface-variant"
          />
          <p className="text-label-sm text-on-surface-variant">
            Email changes go through Supabase Auth's own re-verification flow — not editable here.
          </p>
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Phone</label>
          <input
            name="phone"
            defaultValue={profile.phone ?? ""}
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
          />
        </div>

        {profile.role === "doctor" && (
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Specialty</label>
            <input
              name="specialty"
              defaultValue={profile.specialty ?? ""}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
              placeholder="e.g. Cardiology"
            />
          </div>
        )}

        <div className="pt-md border-t border-outline-variant flex justify-end">
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
