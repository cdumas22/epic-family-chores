import { type LoaderArgs, json } from '@remix-run/node'
import { type V2_MetaFunction, useLoaderData } from '@remix-run/react'
import { prisma } from '~/utils/db.server.ts'
import { requireUserId } from '~/utils/auth.server.ts'
import { ChoreEditor } from '../resources+/chore-editor.tsx'

export const loader = async ({ request }: LoaderArgs) => {
	const userId = await requireUserId(request)
	const data = {
		people: await prisma.person.findMany({ where: { userId } }),
	}
	return json(data)
}

export const meta: V2_MetaFunction = () => {
	return [
		{ title: 'Update Chore' },
		{ name: 'description', content: 'Update an existing chore' },
	]
}

export default () => {
	const { people } = useLoaderData<typeof loader>()

	return (
		<>
			<h1>Create Chore</h1>
			<ChoreEditor people={people as any} />
		</>
	)
}
