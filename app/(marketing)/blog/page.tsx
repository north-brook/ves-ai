import { readdir } from "fs/promises";
import Link from "next/link";
import { join } from "path";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const blogDir = join(process.cwd(), "blog");
  const files = await readdir(blogDir);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(".mdx", "");
      const { frontmatter } = await import(`@/blog/${slug}.mdx`);

      return {
        slug,
        title: frontmatter.title,
        description: frontmatter.description,
        publishedAt: frontmatter.publishedAt,
        updatedAt: frontmatter.updatedAt,
        author: frontmatter.author,
      };
    }),
  );

  // Sort by published date (newest first)
  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-start px-6 py-16">
      <h1 className="font-display mb-6 text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
        Blog
      </h1>

      <div className="space-y-8">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <h2 className="font-display mb-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
              {post.title}
            </h2>

            <p className="mb-3 text-slate-600 dark:text-slate-400">
              {post.description}
            </p>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-500">
              <span>{post.author}</span>
              <span>•</span>
              <time dateTime={post.updatedAt}>
                {new Date(post.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </div>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className="text-slate-600 dark:text-slate-400">
            No blog posts yet. Check back soon!
          </p>
        )}
      </div>
    </div>
  );
}
