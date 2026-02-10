import { defineCollection, z } from "astro:content";

function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
    };

    return date.toLocaleDateString("en-GB", options);
}

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        tags: z.string().array().optional(),
        readingTime: z.number().optional(),
        relatedPosts: z.string().array().optional(),
        createdAt: z.string().transform((str) => formatDate(new Date(str))),
        modifiedAt: z.string().transform((str) => formatDate(new Date(str)))
    }),
});

const projects = defineCollection({
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        tags: z.string().array().optional(),
        repo: z.string().url().optional(),
        liveUrl: z.string().url().optional(),
        status: z.enum(["Dropped", "Planned", "In-Progress", "Completed"])
    }),
});


const work = defineCollection({
    schema: z.object({
        title: z.string(),
        company: z.string().optional(),
        tags: z.string().array().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        location: z.string().optional(),
        liveUrl: z.string().url().optional(),
    }),
});

export const collections = { blog, projects, work };

