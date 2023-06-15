import { Resend } from "resend"
export async function sendEmail(email: {
	to: string
	subject: string
	html: string
	text: string
}) {
	if (!process.env.RESEND_SECRET && !process.env.MOCKS) {
		console.error(`RESEND_SECRET not set and we're not in mocks mode.`)
		console.error(
			`To send emails, set RESEND_SECRET environment variables.`,
		)
		console.error(`Failing to send the following email:`, JSON.stringify(email))
		return
	}
	console.log(process.env.RESEND_SECRET);
	const resend = new Resend(process.env.RESEND_SECRET);

	return resend.emails.send({
		...email,
		from: 'noreply@resend.dev',
	})
}
