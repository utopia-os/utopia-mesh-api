# utopia-mesh-api


## install

- `yarn` is not supported, use `npm` for local development.
- use bun as `node` alternative.
- `node` is only the production build target.

```bash
npm install
```


## development

```bash
npm run dev
```


### schema spec prompt

I have an api https://lionfish-app-a8os7.ondigitalocean.app

for which I need the open api spec to be generated.

there is the endpoint `/places`

which return json in to this zod format:

```ts
const zPlace = z.object({
    date_created: z.string(),
    date_updated: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    position: pointSchema,
    text: z.string().describe('Full text description of the place'),
    user_created: z.string().optional().nullable(),
    user_updated: z.string().optional().nullable(),
    layer: z.string(),
});

```


filtering places works like this via query params:

- `city` - e.g. berlin will scope places to berlin

