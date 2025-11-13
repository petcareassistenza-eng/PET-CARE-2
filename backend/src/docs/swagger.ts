/**
 * Swagger UI Documentation Router
 * 
 * Serve OpenAPI 3.0 specification at /docs endpoint
 * Automatically disables "Try it out" in production for security
 */

import path from 'path'
import fs from 'fs'
import YAML from 'yaml'
import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'

const r = Router()

// Load OpenAPI spec from backend root
const openapiPath = path.resolve(process.cwd(), 'openapi.yaml')

// Verify file exists before attempting to load
if (!fs.existsSync(openapiPath)) {
  console.error(`❌ OpenAPI spec not found at: ${openapiPath}`)
  console.error('💡 Ensure openapi.yaml exists in backend root directory')
  throw new Error('OpenAPI specification file not found')
}

// Parse YAML spec
let doc: any
try {
  const fileContent = fs.readFileSync(openapiPath, 'utf8')
  doc = YAML.parse(fileContent)
  console.log(`✅ Loaded OpenAPI spec: ${doc.info?.title || 'Unknown'} v${doc.info?.version || '?'}`)
} catch (error) {
  console.error('❌ Failed to parse openapi.yaml:', error)
  throw error
}

// Swagger UI options - customize based on environment
const options: swaggerUi.SwaggerUiOptions = {
  customSiteTitle: 'MyPetCare API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1C8275 }
  `,
  swaggerOptions: {
    // Display settings
    displayRequestDuration: true,
    docExpansion: 'list',        // Collapse operations by default
    deepLinking: true,            // Enable deep links for easy sharing
    defaultModelsExpandDepth: 1,  // Collapse models by default
    defaultModelExpandDepth: 3,   // Expand model properties
    
    // Security: Disable interactive requests in production
    // Users can still view documentation but cannot execute API calls
    supportedSubmitMethods: process.env.NODE_ENV === 'production' 
      ? []  // No methods enabled = read-only mode
      : ['get', 'post', 'put', 'delete', 'patch'],  // All methods in dev
    
    // Show request/response samples
    tryItOutEnabled: process.env.NODE_ENV !== 'production',
    
    // Filter operations by tags
    filter: true,
    
    // OAuth2 settings (if needed later)
    persistAuthorization: true,
  },
}

// Mount Swagger UI
r.use('/', swaggerUi.serve)
r.get('/', swaggerUi.setup(doc, options))

// Health check for docs endpoint
r.get('/health', (_req, res) => {
  res.json({
    ok: true,
    spec: {
      title: doc.info?.title,
      version: doc.info?.version,
      endpoints: Object.keys(doc.paths || {}).length,
    },
    mode: process.env.NODE_ENV === 'production' ? 'read-only' : 'interactive',
  })
})

export default r
