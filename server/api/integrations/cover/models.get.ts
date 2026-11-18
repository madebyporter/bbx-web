import { listAvailableCoverModels } from '../../../utils/openaiCover'
import { requireAuthUser } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  const models = listAvailableCoverModels()
  return {
    models,
    defaultModelId: models[0]?.id ?? null,
  }
})
