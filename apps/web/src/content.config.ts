import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const events = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/events" }),
  schema: z.object({
    orderIndex: z.number().optional(),
    title: z.string(),
    description: z.string(),
    type: z.enum(["online", "offline"]),
    date: z.string(),
    location: z.string(),
    logo: z.string().startsWith("/"),
    accent: z.string().startsWith("/").optional(),
    image: z.array(z.string().startsWith("/")),
    thumbnail: z.string().startsWith("/").optional(), // if no thumbnail is provided, use the first image
    brandFields: z.array(
      z.object({
        title: z.string(),
        size: z.enum([
          /* large,  1-2 columns */ "lg",
          /* medium, 3-4 columns */ "md",
          /* small,  5-8 columns */ "sm",
        ]),
        value: z.array(
          z.object({
            name: z.string(),
            link: z.string(),
            image: z.string(),
          }),
        ),
      }),
    ),
    classNames: z
      .object({
        accent: z.string().optional(),
      })
      .optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    logo: z.string().startsWith("/"),
    image: z.array(z.string().startsWith("/")),
    thumbnail: z.string().startsWith("/").optional(), // if no thumbnail is provided, use the first image
  }),
});

// const blogs = defineCollection({
//   loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blogs" }),
//   schema: z.object({
//     title: z.string(),
//     description: z.string(),
//     pubDate: z.coerce.date(),
//   }),
// });

export const collections = { events, projects };
