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

app.get('/places', async (req, res) => {
	const all_places = (await client.request(readItems('places'))) as PlaceResults
	const all_events = (await client.request(readItems('events'))) as PlaceResults
	const all_items = (await client.request(readItems('items'))) as PlaceResults

	const all = [
		...all_places,
		...all_events,
		...all_items
	]

	const city = req.query.city

	let results_places = zPlaces.parse(all)

	if (city && typeof city === 'string') {
		const target_area = await resolvePlace(city)
		const target_rectangle = target_area?.properties?.extent ?? [0,0,0,0]

		const [min_lon, min_lat, max_lon, max_lat] = target_rectangle

		console.log('searching for places in', city, JSON.stringify(target_rectangle))
		results_places = all
			.filter((place) => place.position)
			.map((place) => {
				const place_position = place.position!
				const match = geolib.isPointInPolygon(place_position.coordinates, [
					{ latitude: min_lat, longitude: min_lon },
					{ latitude: max_lat, longitude: min_lon },
					{ latitude: max_lat, longitude: max_lon },
					{ latitude: min_lat, longitude: max_lon }
				])
				const distance = geolib.getDistance(
					place_position.coordinates,
					target_area.geometry.coordinates
				)
				return {
					...place,
					match,
					distance
				}
			})
			.filter((place) => place.match)
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
