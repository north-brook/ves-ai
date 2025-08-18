"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, LoaderCircle, Upload, Check, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { saveProject } from "./actions";
import slugify from "@/lib/slugify";
import { toast } from "sonner";
import clientSupabase from "@/lib/supabase/client";

interface ProjectSetupFormProps {
  defaults: {
    domain: string;
    name: string;
    slug: string;
    image: string;
  };
  projectId?: string;
  isNew?: boolean;
}

export function ProjectSetupForm({
  defaults,
  projectId,
}: ProjectSetupFormProps) {
  const [name, setName] = useState(defaults.name);
  const [slug, setSlug] = useState(defaults.slug);
  const [domain, setDomain] = useState(defaults.domain);
  const [imageUrl, setImageUrl] = useState(defaults.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(defaults.image);
  const [invites, setInvites] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNew = !projectId;

  const saveProjectMutation = useMutation({
    mutationFn: saveProject,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
    },
  });

  // Check slug availability
  const { data: slugAvailable, isLoading: checkingSlug } = useQuery({
    queryKey: ["slug-availability", slug, projectId],
    queryFn: async () => {
      if (!slug || slug.length < 3) return null;
      const supabase = clientSupabase();
      let query = supabase.from("projects").select("id").eq("slug", slug);
      if (projectId) query = query.not("id", "eq", projectId);
      const { data, error } = await query;

      return !error && data?.length === 0;
    },
    enabled: !!slug && slug.length >= 3,
    staleTime: 1000,
  });

  // Auto-generate slug when name changes (only for new projects)
  useEffect(() => {
    if (isNew && name && name !== defaults.name) {
      setSlug(slugify(name));
    }
  }, [name, defaults.name, isNew]);

  // Update image when domain changes (only if no custom image)
  useEffect(() => {
    if (
      domain &&
      domain !== defaults.domain &&
      !imageFile &&
      imageUrl === defaults.image
    ) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      setImageUrl(faviconUrl);
      setImagePreview(faviconUrl);
    }
  }, [domain, defaults.domain, defaults.image, imageFile, imageUrl]);

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  return (
    <form
      action={(formData) => saveProjectMutation.mutate(formData)}
      className="space-y-6"
    >
      {/* Hidden input for project ID when editing */}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}

      {/* Image and Name inline */}
      <div className="flex items-start gap-4">
        {/* Image Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            name="imageFile"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file);
            }}
            className="hidden"
          />
          <div
            className={`bg-surface border-border relative h-[50px] w-[50px] overflow-hidden rounded-lg border-2 transition-all ${
              isDragging ? "border-accent-purple bg-accent-purple/10" : ""
            } hover:border-accent-purple cursor-pointer`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Project"
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Upload className="text-foreground-secondary h-6 w-6" />
              </div>
            )}
          </div>
        </div>

        {/* Name Input */}
        <div className="flex-1">
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple h-[50px] w-full rounded-lg border px-4 text-lg font-semibold transition-colors outline-none"
            placeholder="ACME"
          />
        </div>
      </div>

      {/* Hidden input for image URL */}
      <input type="hidden" name="image" value={imageUrl} />

      <div>
        <label htmlFor="slug" className="mb-2 block text-sm font-medium">
          Project Slug
        </label>
        <div className="relative">
          <div className="flex items-center">
            <span className="text-foreground-secondary mr-2">{`ves.ai /`}</span>
            <input
              type="text"
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9-]+"
              className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple flex-1 rounded-lg border px-4 py-3 pr-10 transition-colors outline-none"
              placeholder="my-project"
            />
            {slug.length >= 3 && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                {checkingSlug ? (
                  <LoaderCircle className="text-foreground-secondary h-4 w-4 animate-spin" />
                ) : slugAvailable ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : slugAvailable === false ? (
                  <X className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
        </div>
        <p className="text-foreground-secondary mt-1 text-xs">
          URL-friendly identifier for your project
        </p>
      </div>

      <div>
        <label htmlFor="domain" className="mb-2 block text-sm font-medium">
          Project Domain
        </label>
        <input
          type="text"
          id="domain"
          name="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
          className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple w-full rounded-lg border px-4 py-3 transition-colors outline-none"
          placeholder="acme.com"
        />
      </div>

      <div>
        <label htmlFor="invites" className="mb-2 block text-sm font-medium">
          Invite Team Members (Optional)
        </label>
        <textarea
          id="invites"
          name="invites"
          value={invites}
          onChange={(e) => setInvites(e.target.value)}
          rows={3}
          className="bg-surface border-border placeholder:text-foreground-secondary focus:border-accent-purple w-full rounded-lg border px-4 py-3 transition-colors outline-none"
          placeholder={`bob@${domain}, alice@${domain}`}
        />
      </div>

      <button
        type="submit"
        disabled={
          saveProjectMutation.isPending || (isNew && slugAvailable === false)
        }
        className="group font-display from-accent-purple via-accent-pink to-accent-orange relative w-full rounded-lg bg-gradient-to-r p-[2px] text-lg font-semibold transition-all duration-200 disabled:opacity-50"
      >
        <div className="bg-background group-hover:bg-background/90 flex items-center justify-center gap-2 rounded-[6px] px-8 py-4 transition-all">
          <span className="text-foreground font-semibold">Continue</span>
          {saveProjectMutation.isPending ? (
            <LoaderCircle className="text-foreground h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="text-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </button>
    </form>
  );
}

export function ProjectSetupFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-surface h-[50px] w-[50px] animate-pulse rounded-lg" />
        <div className="flex-1">
          <div className="bg-surface mb-2 h-5 w-24 animate-pulse rounded" />
          <div className="bg-surface h-[50px] w-full animate-pulse rounded-lg" />
        </div>
      </div>

      <div>
        <div className="bg-surface mb-2 h-5 w-24 animate-pulse rounded" />
        <div className="bg-surface h-12 w-full animate-pulse rounded-lg" />
      </div>

      <div>
        <div className="bg-surface mb-2 h-5 w-24 animate-pulse rounded" />
        <div className="bg-surface h-12 w-full animate-pulse rounded-lg" />
      </div>

      <div>
        <div className="bg-surface mb-2 h-5 w-32 animate-pulse rounded" />
        <div className="bg-surface h-24 w-full animate-pulse rounded-lg" />
      </div>

      <div className="from-accent-purple/20 via-accent-pink/20 to-accent-orange/20 h-14 w-full animate-pulse rounded-lg bg-gradient-to-r" />
    </div>
  );
}
