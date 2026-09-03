"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/(dashboard)/profile/actions";
import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileFormValues {
  fullName: string;
  phone: string;
  specialty: string;
  avatarUrl: string;
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [isPending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: profile.full_name || "",
      phone: profile.phone ?? "",
      specialty: profile.specialty ?? "",
      avatarUrl: profile.avatar_url ?? "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", data.fullName);
      formData.set("phone", data.phone);
      formData.set("specialty", data.specialty);
      formData.set("avatarUrl", avatarUrl ?? "");
      const res = await updateProfileAction({ error: null }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Profile saved.");
      }
    });
  };

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
        toast.error("Error uploading avatar: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      toast.error("Error: " + err.message);
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

      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
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
            {...register("fullName")}
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
          />
          {errors.fullName && (
            <p className="text-body-sm text-error">{errors.fullName.message}</p>
          )}
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
            {...register("phone")}
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
          />
        </div>

        {profile.role === "doctor" && (
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Specialty</label>
            <input
              {...register("specialty")}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
              placeholder="e.g. Cardiology"
            />
          </div>
        )}

        <div className="pt-md border-t border-outline-variant flex justify-end">
          <button
            className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
