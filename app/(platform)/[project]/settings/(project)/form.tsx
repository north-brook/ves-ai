"use client";

import clientSupabase from "@/lib/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updateProject } from "./actions";

interface ProjectFormProps {
  project: {
    id: string;
    name: string;
    slug: string;
    domain: string;
    image: string;
  };
}

export default function ProjectForm({ project }: ProjectFormProps) {
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [domain, setDomain] = useState(project.domain);
  const [imageUrl, setImageUrl] = useState(project.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(project.image);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProjectMutation = useMutation({
    mutationFn: updateProject,
    onSettled: (data) => {
      if (data?.error) toast.error(data.error);
      // Success handled by redirect in action
    },
  });

  // Check slug availability (only if slug changed)
  const { data: slugAvailable, isLoading: checkingSlug } = useQuery({
    queryKey: ["slug-availability", slug, project.id],
    queryFn: async () => {
      if (!slug || slug.length < 3 || slug === project.slug) return null;
      const supabase = clientSupabase();
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .not("id", "eq", project.id);

      return !error && data?.length === 0;
    },
    enabled: !!slug && slug.length >= 3 && slug !== project.slug,
    staleTime: 1000,
  });

  // Update image when domain changes (only if no custom image)
  useEffect(() => {
    if (domain && !imageFile && domain !== project.domain) {
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      setImageUrl(faviconUrl);
      setImagePreview(faviconUrl);
    }
  }, [domain, imageFile, project.domain]);

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

  const hasChanges =
    name !== project.name ||
    slug !== project.slug ||
    domain !== project.domain ||
    imageFile !== null ||
    (imageUrl !== project.image && !imageFile);

  return (
    <div className="w-full max-w-2xl space-y-12">
      {/* Update Project Form */}
      <form
        action={(formData) => updateProjectMutation.mutate(formData)}
        className="space-y-6"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="image" value={imageUrl} />

        <div>
          <h2 className="mb-6 text-2xl font-semibold text-slate-800 dark:text-slate-200">
            Project Settings
          </h2>

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
                className={`relative h-[50px] w-[50px] cursor-pointer overflow-hidden rounded-lg border-2 bg-slate-50 transition-all dark:bg-slate-900 ${
                  isDragging
                    ? "border-slate-400 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
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
                    <Upload className="h-6 w-6 text-slate-600 dark:text-slate-400" />
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
                className="h-[50px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-lg font-semibold outline-none transition-colors placeholder:text-slate-600 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-400 dark:focus:border-slate-600"
                placeholder="Project Name"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="slug" className="mb-2 block text-sm font-medium">
            Project Slug
          </label>
          <div className="relative">
            <div className="flex items-center">
              <span className="mr-2 text-slate-600 dark:text-slate-400">{`ves.ai /`}</span>
              <input
                type="text"
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                pattern="[a-z0-9-]+"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-10 outline-none transition-colors placeholder:text-slate-600 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-400 dark:focus:border-slate-600"
                placeholder="my-project"
              />
              {slug.length >= 3 && slug !== project.slug && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {checkingSlug ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-slate-600 dark:text-slate-400" />
                  ) : slugAvailable ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : slugAvailable === false ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            URL-friendly identifier for your project
          </p>
        </div>

        <div>
          <label htmlFor="domain" className="mb-2 block text-sm font-medium">
            Product URL
          </label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-colors placeholder:text-slate-600 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-400 dark:focus:border-slate-600"
            placeholder="example.com"
          />
        </div>

        <button
          type="submit"
          disabled={
            updateProjectMutation.isPending ||
            !hasChanges ||
            (slug !== project.slug && slugAvailable === false)
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {updateProjectMutation.isPending ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </form>
    </div>
  );
}
