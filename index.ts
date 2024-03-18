import express from 'express';
import {createDirectus, rest, graphql, readItems} from '@directus/sdk';

const app = express();
const port = parseInt(process.env.PORT || '3000'); // You can use any port that is free on your system


const client = createDirectus<any>('https://api.utopia-lab.org/').with(rest());

app.get('/', async (req, res) => {
    const result = await client.request(readItems('places'));
    res.send(result);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});