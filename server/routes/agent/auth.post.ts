import {
  buildAgentRegistrationResponse,
  oauthResourceMetadataWwwAuthenticate,
} from '../../utils/authMd'

export default defineEventHandler((event) => {
  setResponseStatus(event, 401, 'Unauthorized')
  setHeader(event, 'WWW-Authenticate', oauthResourceMetadataWwwAuthenticate())
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return buildAgentRegistrationResponse()
})
