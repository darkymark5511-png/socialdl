import { z } from "zod";

export const downloadSchema = z.object({
  url: z
    .string()
    .url({ message: "Invalid URL" })
    .max(2000, { message: "URL too long" }),
});

export const zipItemSchema = z.object({
  url: z.string().url().max(2000),
  filename: z
    .string()
    .min(1)
    .max(180)
    .regex(/^[a-zA-Z0-9._\- ()\[\]]+$/, "Invalid filename characters"),
});

export const zipSchema = z.object({
  items: z.array(zipItemSchema).min(1).max(20),
});

export type DownloadInput = z.infer<typeof downloadSchema>;
export type ZipInput = z.infer<typeof zipSchema>;
