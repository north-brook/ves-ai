// takes a string and creates a slug (extract only alphanumeric characters and spaces, replace spaces with hyphens, and suffix with a short random id)
function randomDigits(length: number = 5): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export default function slugify(value?: string): string;
export default function slugify(
  value?: string,
  options?: {
    unique?: boolean;
  },
): string;
export default function slugify(
  value?: string,
  options?: {
    unique?: boolean;
  },
) {
  if (!value) return "";
  return (
    // Remove leading and trailing hyphens
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace consecutive non-alphanumeric chars with a single hyphen
      .replace(/^-+|-+$/g, "") + (options?.unique ? "-" + randomDigits(5) : "")
  );
}

export function titlefy(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
