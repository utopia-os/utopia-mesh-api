import express from 'express';
import {createDirectus, rest, graphql, readItems} from '@directus/sdk';
import {type Schema, zPlace} from "./src/zod-types.ts"
import {z} from "zod"

const app = express();
const port = parseInt(process.env.PORT || '3000'); // You can use any port that is free on your system




const client = createDirectus<any>('https://api.utopia-lab.org/').with(rest());

type PlaceResults = {
    name: string,
    description: string,
}[]

app.get('/places', async (req, res) => {
    const result = await client.request(readItems('places')) as PlaceResults;
    const city = req.query.city;
    const radius = req.query.radius;

    const places = z.array(zPlace).parse(result)

    console.log(places)

    res.send(places);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});