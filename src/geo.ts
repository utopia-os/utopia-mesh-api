import {search} from 'photon-geocoder'


export async function resolvePlace(place: string) {
  console.log('Resolving place', place)
  const result = await search(place, {
    limit: 1
  })
  return result.features[0]
}
