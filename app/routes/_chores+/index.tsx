import { json } from '@remix-run/node'
import type {
	ActionFunction,
	DataFunctionArgs,
	V2_MetaFunction,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { endOfDay, startOfDay } from 'date-fns'
import groupBy from 'lodash/groupBy'
import orderBy from 'lodash/orderBy'
import ChoreComplete from '~/components/ChoreComplete.tsx'
import PersonCard from '~/components/PersonCard.tsx'
import { useChoreContext } from '~/root.tsx'
// import { useChoreContext } from '~/root.tsx'
import { authenticator, requireUserId } from '~/utils/auth.server.ts'
import { DAY, IsDayChecked } from '~/utils/days.ts'
import { prisma } from '~/utils/db.server.ts'

export type PersonLoader = typeof loader
export async function loader({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			imageId: true,
		},
	})
	if (!user) {
		throw await authenticator.logout(request, { redirectTo: '/' })
	}

	const d = startOfDay(new Date())
	const people = await prisma.person.findMany({
		orderBy: [{ order: 'asc' }],
		where: { userId: user.id },
		include: {
			chores: {
				include: {
					timeOfDay: true,
				},
			},
		},
	})

	const choreStatus = await prisma.chore_Status.findMany({
		where: {
			choreId: {
				in: people.flatMap(p => p.chores.map(c => c.id)),
			},
		},
	})

	return json(
		people.map(x => ({
			id: x.id,
			color: x.color,
			imageId: x.imageId,
			name: x.name,

			chores: groupBy(
				orderBy(
					x.chores.flatMap(y => {
						const status = choreStatus.find(z => z.choreId === y.id)
						if (
							y.startDate != null &&
							y.endDate != null &&
							!(
								d >= new Date(y.startDate) &&
								new Date() <= endOfDay(new Date(y.endDate))
							)
						)
							return []

						return y.repeat === 0 ||
							IsDayChecked(y.repeat, Object.values(DAY)[d.getDay() - 1])
							? [
									{
										title: y.title,
										icon: y.icon,
										order: y.order,
										id: y.id,
										pointValue: y.pointValue,
										timeOfDayOrder: y.timeOfDay.order,
										timeOfDayName: y.timeOfDay.name,
										completed: status?.completed ?? false,
										pointsEarned: status?.pointsEarned ?? 0,
									},
							  ]
							: []
					}),
					['timeOfDayOrder', 'order'],
				),
				'timeOfDayName',
			),
		})),
	)
}

export const meta: V2_MetaFunction = () => {
	return [
		{ title: 'Family Chores' },
		{ name: 'description', content: 'Track chores for your family members.' },
	]
}
export let action: ActionFunction = async ({ request }) => {
	const d = startOfDay(new Date())

	const data = new URLSearchParams(await request.text())
	const completeTodoId = data.get('complete')
	if (!completeTodoId) {
		return json(
			{ error: 'Todo id must be defined' },
			{
				status: 400,
			},
		)
	}
	const choreStatus = await prisma.chore_Status.findFirst({
		where: {
			AND: [
				{
					choreId: completeTodoId,
				},
				{
					date: {
						gte: d,
					},
				},
			],
		},
	})

	// Create or update status
	if (choreStatus == null) {
		const chore = await prisma.chore.findUniqueOrThrow({
			where: { id: completeTodoId },
		})
		const created = await prisma.chore_Status.create({
			data: {
				choreId: completeTodoId,
				pointsEarned: chore.pointValue,
				completed: true,
			},
		})
		return json(created, { status: 201 })
	} else {
		const updatedTodo = await prisma.chore_Status.update({
			where: {
				id: choreStatus.id,
			},
			data: {
				completed: !choreStatus.completed,
			},
		})
		return json(updatedTodo, { status: 200 })
	}
}

export default function Index() {
	const people = useLoaderData<PersonLoader>()
	const choreContext = useChoreContext()

	return (
		<main className="container relative h-screen overflow-y-auto overflow-x-hidden p-4">
			{choreContext.choreComplete && <ChoreComplete />}
			<div className="flex h-full flex-row gap-4">
				{people.map(person => (
					<PersonCard key={person.id} person={person} />
				))}
			</div>
			<Link
				preventScrollReset
				to="create"
				title="Create chore"
				aria-label="Create chore"
				className="fixed bottom-4 right-4"
			>
				Add
			</Link>

			<Outlet />
		</main>
	)
}
