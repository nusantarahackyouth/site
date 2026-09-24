import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const events = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(["online", "offline"]),
    date: z.string(),
    location: z.string(),
    image: z.string(),
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
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    image: z.string(),
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
