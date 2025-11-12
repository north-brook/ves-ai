import { readdir } from "fs/promises";
import type { Metadata } from "next";
import { join } from "path";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ post: string }>;
}) {
  const { post } = await params;
  const { default: Post } = await import(`@/blog/${post}.mdx`);

  return <Post />;
}

export async function generateStaticParams() {
  const blogDir = join(process.cwd(), "blog");
  const files = await readdir(blogDir);

  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({
      post: file.replace(".mdx", ""),
    }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ post: string }>;
}): Promise<Metadata> {
  const { post } = await params;
  const { frontmatter } = await import(`@/blog/${post}.mdx`);

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
  };
}

export const dynamicParams = false;
