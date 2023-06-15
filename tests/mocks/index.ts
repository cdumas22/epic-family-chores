import { rest } from 'msw'
import { setupServer } from 'msw/node'
import closeWithGrace from 'close-with-grace'
import { writeEmail } from './utils.ts'

const handlers = [
	process.env.REMIX_DEV_HTTP_ORIGIN
		? rest.post(`${process.env.REMIX_DEV_HTTP_ORIGIN}/ping`, req =>
				req.passthrough(),
		  )
		: null,
	process.env.RESEND_SECRET
		? rest.post(`https://api.resend.com/emails`, async (req, res, ctx) => {
				const body = await req.text()
				console.info('🔶 mocked email contents:', body)

				await writeEmail(JSON.parse(body))

				const randomId = '20210321210543.1.E01B8B612C44B41B'
				const id = `<${randomId}>@${req.params.domain}`
				return res(ctx.json({ id, message: 'Queued. Thank you.' }))
		  })
		: null,
].filter(Boolean)

const server = setupServer(...handlers)

server.listen({ onUnhandledRequest: 'warn' })
console.info('🔶 Mock server installed')

closeWithGrace(() => {
	server.close()
})
