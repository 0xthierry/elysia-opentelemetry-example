import { Elysia } from 'elysia'
import opentelemetryAPI from '@opentelemetry/api'
import { opentelemetry } from '@elysiajs/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import {
	ConsoleMetricExporter,
	MeterProvider,
	PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { PrismaInstrumentation } from '@prisma/instrumentation'
import { user } from './user'
import { post } from './post'
import { Resource } from '@opentelemetry/resources'
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions'

const metricReader = new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),
  // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
  exportIntervalMillis: 10000,
});

const resource = new Resource({
	[ATTR_SERVICE_NAME]: 'elysia-opentelemetry-example',
	[ATTR_SERVICE_VERSION]: '1.0.0',
	'deployment.environment.name': 'development'
})

const otlpTraceExporter = new OTLPTraceExporter()
const myServiceMeterProvider = new MeterProvider({
  resource: resource,
  readers: [metricReader],
});
opentelemetryAPI.metrics.setGlobalMeterProvider(myServiceMeterProvider);

const app = new Elysia()
	.onBeforeHandle(
		{ as: 'global' },
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
			instrumentations: [new PrismaInstrumentation({middleware: true})],
			spanProcessors: [new BatchSpanProcessor(otlpTraceExporter)],
			traceExporter: otlpTraceExporter,
			resource: resource,
			serviceName: 'elysia-opentelemetry-example'
		})
	)
	.get('/health', function health() {
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
