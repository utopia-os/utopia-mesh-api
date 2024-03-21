import express from 'express'
import { createDirectus, readItems, rest } from '@directus/sdk'
import { zPlaces } from './src/zod-types.ts'
import { z } from 'zod'
import { resolvePlace } from './src/geo.ts'
import * as geolib from 'geolib'

const app = express()
const port = parseInt(process.env.PORT || '3000') // You can use any port that is free on your system

const client = createDirectus<any>('https://api.utopia-lab.org/').with(rest())

type PlaceResults = z.infer<typeof zPlaces>

import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from '@langchain/openai'

let vectorStore = new MemoryVectorStore(new OpenAIEmbeddings())
let all = await getAllData()

async function getAllData() {
	const all_places = (await client.request(readItems('places'))) as PlaceResults
	const all_events = (await client.request(readItems('events'))) as PlaceResults
	const all_items = (await client.request(readItems('items'))) as PlaceResults

	const all = [...all_places, ...all_events, ...all_items]

	vectorStore.addDocuments(
		all.map((o) => {
			return {
				pageContent: `${o.name} ${o.text}`,
				metadata: {
					place: o
				}
			}
		})
	)

	return zPlaces.parse(all)
}

const truthy = ['true', '1', 'yes']

app.get('/places', async (req, res) => {
	const city = req.query.city ?? req.query.region ?? req.query.contry

	const add_vector = truthy.includes(`${req.query.vector}`)

	let results_places = all

	if (city && typeof city === 'string') {
		const target_area = await resolvePlace(city)
		const target_rectangle = target_area?.properties?.extent ?? [0, 0, 0, 0]

		const [min_lon, min_lat, max_lon, max_lat] = target_rectangle

		console.log('searching for places in', city, JSON.stringify(target_rectangle))
		results_places = all
			.filter((place) => place.position)
			.filter((place) => {
				const place_position = place.position!
				const match = geolib.isPointInPolygon(place_position.coordinates, [
					{ latitude: min_lat, longitude: min_lon },
					{ latitude: max_lat, longitude: min_lon },
					{ latitude: max_lat, longitude: max_lon },
					{ latitude: min_lat, longitude: max_lon }
				])
				return match
			})
			.map((place) => {
				const place_position = place.position!
				const distance = geolib.getDistance(
					place_position.coordinates,
					target_area.geometry.coordinates
				)
				return {
					...place,
					distance,
					...(add_vector
						? {
								vector: vectorStore.memoryVectors.find((v) => v.metadata.place.id === place.id)
							}
						: {})
				}
			})
	}

	res.send(results_places)
})

app.get('/geo/:place', async (req, res) => {
	res.send(await resolvePlace(req.params.place))
})

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error(err.stack)
	res.status(500).send('Something broke!')
})

app.listen(port, () => {
	console.log(`listening at http://localhost:${port}`)
})
