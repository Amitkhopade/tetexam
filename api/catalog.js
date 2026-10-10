import { handleError, json, methodOnly } from './_lib/http.js'
import { getPublicCatalog } from './_lib/catalog.js'

export default async function handler(req,res) {
  if(!methodOnly(req,res,'GET')) return
  try { json(res,200,await getPublicCatalog()) }
  catch(error){handleError(res,error)}
}
