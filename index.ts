import express from 'express'
import { createDirectus, readItems, rest } from '@directus/sdk'
import {zPlace, zPlaces} from './src/zod-types.ts'
import { z } from 'zod'
import { resolvePlace } from './src/geo.ts'
import * as geolib from 'geolib'

const app = express()
app.set('json spaces', 4);
const port = parseInt(process.env.PORT || '3000') // You can use any port that is free on your system

const client = createDirectus<any>('https://api.utopia-lab.org/').with(rest())

type PlaceResult = z.infer<typeof zPlace>
type PlaceResults = z.infer<typeof zPlaces>

import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from '@langchain/openai'

let all_places: PlaceResults = []
let vectorStore = new MemoryVectorStore(new OpenAIEmbeddings())
let prep_promise =  init_and_prep_places()

async function init_and_prep_places() {
	//const all_place_items = (await client.request(readItems('places'))) as PlaceResults
	//const all_event_items = (await client.request(readItems('events'))) as PlaceResults
	const all_generic_items = (await client.request(readItems('items'))) as PlaceResults

	all_places = all_generic_items
	//all_places =  zPlaces.parse([...all_place_items, ...all_event_items, ...all_generic_items])

	vectorStore.addDocuments(
		all_places.map((o) => {
			return {
				pageContent: `${o.name} ${o.text}`,
				metadata: {
					place: o
				}
			}
		})
	)

}

const truthy = ['true', '1', 'yes']

app.get('/places', async (req, res) => {
	const city = req.query.city ?? req.query.region ?? req.query.contry
	const add_vector = truthy.includes(`${req.query.vector}`)

	await prep_promise

	let results_places = all_places

	if (city && typeof city === 'string') {
		const target_area = await resolvePlace(city)
		const target_rectangle = target_area?.properties?.extent ?? [0, 0, 0, 0]

		const [min_lon, min_lat, max_lon, max_lat] = target_rectangle

		console.log('searching for places in', city, JSON.stringify(target_rectangle))
		results_places = all_places
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
								vector: vectorStore.memoryVectors.find((v) => (v.metadata.place as PlaceResult).id === place.id)
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

app.get('/similar/:what', async (req, res) => {
	await prep_promise
	let count = parseInt(`${req.query.count}`)
	if (isNaN(count)) {
		count = 10
	}
	const most_similar = await vectorStore.similaritySearch(req.params.what, count)
	res.send(most_similar.map((o) => o.metadata.place as PlaceResult))
})

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error(err.stack)
	res.status(500).send('Something broke!')
})

app.listen(port, () => {
	console.log(`listening at http://localhost:${port}`)
})
