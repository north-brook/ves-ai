"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import serverSupabase from "@/lib/supabase/server";

export async function triggerInitialProcessing(formData: FormData) {
  const projectSlug = formData.get("project-slug") as string;

  const supabase = await serverSupabase();

  // Get the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (projectError || !project) {
    console.error("❌ [WELCOME] Project not found:", projectSlug);
    throw new Error("Project not found");
  }

  console.log(
    `🚀 [WELCOME] Scheduling initial processing for project ${project.id}`,
  );

  // Trigger the job run in the background after the response is sent
  after(async () => {
    console.log(
      `🔄 [WELCOME] Starting background job for project ${project.id}`,
    );
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/jobs/run?project_id=${project.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [WELCOME] Failed to trigger job:`, errorText);
      } else {
        const result = await response.json();
        console.log(`✅ [WELCOME] Job triggered successfully:`, result);
      }
    } catch (error) {
      console.error(`❌ [WELCOME] Error triggering job:`, error);
    }
  });

  // Redirect to dashboard immediately
  redirect(`/${projectSlug}`);
}
