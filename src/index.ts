import { Elysia } from 'elysia'
import { opentelemetry } from '@elysiajs/opentelemetry'

import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { PrismaInstrumentation } from '@prisma/instrumentation'
import { user } from './user'
import { post } from './post'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
const otlpTraceExporter = new OTLPTraceExporter()


const app = new Elysia()
	.onBeforeHandle({as: 'global'},
		function injectAttributes({
			body,
			cookie,
			params,
			request,
			response,
			route,
			server,
			store,
			headers,
			path,
			query
		}) {}
	)
	.use(
		opentelemetry({
			instrumentations: [new PrismaInstrumentation()],
			spanProcessors: [new BatchSpanProcessor(otlpTraceExporter)],
			traceExporter: otlpTraceExporter,
			resource: new Resource({
				[ATTR_SERVICE_NAME]: 'elysia-opentelemetry-example',
				[ATTR_SERVICE_VERSION]: '1.0.0',
				'deployment.environment.name': 'development',
			}),
			serviceName: 'elysia-opentelemetry-example',
		})
	)
	.get('/health', () => {
		return {
			status: 'ok'
		}
	})
	.use(user)
	.use(post)
	.listen(3000)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
