
import { z } from 'zod';

const pointSchema = z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
});

export const zPlace = z.object({
    id: z.string(),
    name: z.string(),
    position: pointSchema.optional().nullable(),
    text: z.string().describe('Full text description of the place'),
}).strip();

//date_created: z.string(),
//date_updated: z.string().nullable(),
//user_created: z.string().optional().nullable(),
//user_updated: z.string().optional().nullable(),
//layer: z.string(),

export const zPlaces = z.array(zPlace);



export type Schema = {
    collection_place: z.infer<typeof zPlaces>
}