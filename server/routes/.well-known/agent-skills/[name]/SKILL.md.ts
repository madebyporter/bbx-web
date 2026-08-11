import { createError } from 'h3'
import { getAgentSkillDefinition } from '../../../../utils/agentSkills'

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const name = getRouterParam(event, 'name') || ''
  const skill = getAgentSkillDefinition(name)
  if (!skill) {
    throw createError({ statusCode: 404, statusMessage: 'Skill not found' })
  }

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')
  return skill.content
})
