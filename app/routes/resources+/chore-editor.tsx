import { DataFunctionArgs, json, redirect } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from '~/utils/auth.server.ts'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { prisma } from '~/utils/db.server.ts'
import { Chore, ChoreGetPayload, Person, Prisma } from '@prisma/client'
import { useFetcher } from '@remix-run/react'
import { conform, useForm } from '@conform-to/react'
import { Button, ErrorList, Field } from '~/utils/forms.tsx'
import { useState } from 'react'
import { DAY, EVERY_DAY, IsDayChecked } from '~/utils/days.ts'

// model Chore {
//     id           String         @id @unique @default(cuid())
//     title        String
//     createdAt    DateTime       @default(now())
//     updatedAt    DateTime       @updatedAt
//     pointValue   Int            @default(1)
//     order        Int            @default(1)
//     icon         String         @default("")
//     repeat       Int            @default(0)
//     startDate    String?
//     endDate      String?
//     timeOfDay    TimeOfDay      @relation(fields: [timeOfDayId], references: [id])
//     timeOfDayId  String
//     people       Person[]
//     chore_status Chore_Status[]
//   }
// model Person {
//     id        String   @id @unique @default(cuid())
//     name      String
//     createdAt DateTime @default(now())
//     updatedAt DateTime @updatedAt
//     color     String   @default("")
//     order     Int      @default(1)
//     image     Image?   @relation(fields: [imageId], references: [fileId])
//     imageId   String?  @unique
//     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: Cascade)
//     userId    String
//     chores    Chore[]
//   }

export const ChoreStatusSchema = z.object({
	id: z.string().optional(),
	choreId: z.string(),
	date: z.date(),
	pointsEarned: z.number().int(),
	complete: z.boolean(),
})
export const ChoreEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1),
	pointValue: z.coerce.number().int().min(1),
	order: z.coerce.number().int().min(1).refine(Number),
	icon: z.string().optional(),
	repeat: z.coerce.number().int().min(0).refine(Number),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	timeOfDayId: z.string(),
	people: z.array(z.string()).optional(),
})
export const TimeOfDaySchema = z.object({
	id: z.string().optional(),
	order: z.number().int().min(1),
	name: z.string().min(1),
	userId: z.string(),
})

export const PersonSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	color: z.string().optional(),
	order: z.number().int().min(1),
	imageId: z.string().optional(),
	userId: z.string(),
	chores: z.array(ChoreEditorSchema).optional(),
})

export async function action({ request }: DataFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: ChoreEditorSchema,
		acceptMultipleErrors: () => true,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json(
			{
				status: 'error',
				submission,
			} as const,
			{ status: 400 },
		)
	}
	let chore: Chore

	const data = {
		title: submission.value.title,
		pointValue: submission.value.pointValue,
		order: submission.value.order,
		icon: submission.value.icon,
		repeat: submission.value.repeat,
		startDate: submission.value.startDate
			? new Date(submission.value.startDate).valueOf().toString()
			: null,
		endDate: submission.value.endDate
			? new Date(submission.value.endDate).valueOf().toString()
			: null,
		timeOfDayId: submission.value.timeOfDayId,
		people: {
			connect: submission.value.people?.map(id => ({ id })),
		},
	}
	if (submission.value.id) {
		const existingChore = await prisma.chore.findFirstOrThrow({
			where: {
				id: submission.value.id,
			},
			include: {
				people: {
					where: {
						userId,
					},
				},
			},
		})
		if (existingChore.people.length === 0) {
			return json({ status: 'error', submission } as const, { status: 401 })
		}

		chore = await prisma.chore.update({
			where: { id: submission.value.id },
			data,
		})
	} else {
		chore = await prisma.chore.create({
			data,
		})
	}

	return redirect(`/`)
}

export function ChoreEditor({
	chore,
	people,
}: {
	chore?: Prisma.ChoreGetPayload<{ include: { people: true } }>
	people: Person[]
}) {
	const choreEditorFetcher = useFetcher<typeof action>()
	const [repeat, setRepeat] = useState(chore?.repeat ?? 0)
	const [assignedPeople, setPeople] = useState<string[]>(
		chore?.people.map(x => x.id) ?? [],
	)
	const [form, fields] = useForm({
		id: 'chore-editor',
		constraint: getFieldsetConstraint(ChoreEditorSchema),
		lastSubmission: choreEditorFetcher.data?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ChoreEditorSchema })
		},
		defaultValue: {
			title: chore?.title,
			pointValue: chore?.pointValue ?? 1,
			order: chore?.order ?? 1,
			icon: chore?.icon,
			repeat: chore?.repeat ?? 0,
			startDate: chore?.startDate,
			endDate: chore?.endDate,
			// timeOfDayId: chore?.timeOfDayId,
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<choreEditorFetcher.Form
			method="post"
			action="/resources/chore-editor"
			{...form.props}
		>
			<input type="hidden" name="id" value={chore?.id} />
			<Field
				labelProps={{ htmlFor: fields.title.id, children: 'Title' }}
				inputProps={{ ...conform.input(fields.title) }}
				errors={fields.title.errors}
			/>
			<Field
				labelProps={{ htmlFor: fields.pointValue.id, children: 'Point Value' }}
				inputProps={{
					...conform.input(fields.pointValue),
					min: 1,
					type: 'number',
				}}
				errors={fields.pointValue.errors}
			/>
			<Field
				labelProps={{ htmlFor: fields.order.id, children: 'Order' }}
				inputProps={{ ...conform.input(fields.order), min: 1, type: 'number' }}
				errors={fields.order.errors}
			/>
			<Field
				labelProps={{ htmlFor: fields.icon.id, children: 'Icon' }}
				inputProps={{
					...conform.input(fields.icon),
					placeholder: 'emoji icon',
				}}
				errors={fields.icon.errors}
			/>
			<Field
				labelProps={{
					htmlFor: fields.startDate.id,
					children: 'Start Date (optional)',
				}}
				inputProps={{ ...conform.input(fields.startDate), type: 'date' }}
				errors={fields.startDate.errors}
			/>
			<Field
				labelProps={{
					htmlFor: fields.endDate.id,
					children: 'End Date (optional)',
				}}
				inputProps={{ ...conform.input(fields.endDate), type: 'date' }}
				errors={fields.endDate.errors}
			/>

			<fieldset>
				<legend>Days of the Week</legend>
				<input type="hidden" name="repeat" value={repeat} />
				<div className="mb-4 flex items-start items-center">
					<input
						id="every-day"
						aria-describedby="every-day"
						type="checkbox"
						value={EVERY_DAY}
						checked={repeat === EVERY_DAY}
						className="focus:ring-3 h-4 w-4 rounded border-gray-300 bg-gray-50 focus:ring-blue-300"
						onChange={e => setRepeat(e.target.checked ? EVERY_DAY : 0)}
					/>
					<label
						htmlFor="every-day"
						className="ml-3 text-sm font-medium text-gray-900"
					>
						Every Day
					</label>
				</div>
				{Object.entries(DAY).map(([day, value]) => (
					<div className="mb-4 flex items-start items-center" key={day}>
						<input
							id={`checkbox-${day}`}
							aria-describedby={`checkbox-${day}`}
							type="checkbox"
							value={day}
							checked={IsDayChecked(repeat, value)}
							className="focus:ring-3 h-4 w-4 rounded border-gray-300 bg-gray-50 focus:ring-blue-300"
							onChange={e =>
								setRepeat(e.target.checked ? repeat | value : repeat & ~value)
							}
						/>
						<label
							htmlFor={`checkbox-${day}`}
							className="ml-3 text-sm font-medium text-gray-900"
						>
							{day}
						</label>
					</div>
				))}
			</fieldset>
			<fieldset>
				<legend>People</legend>
				<input type="hidden" name="people" value={assignedPeople} />
				{people.map(person => (
					<div className="mb-4 flex items-start items-center" key={person.id}>
						<input
							id={`checkbox-person-${person.id}`}
							aria-describedby={`checkbox-person-${person.id}`}
							type="checkbox"
							value={person.id}
							checked={assignedPeople.some(x => x === person.id)}
							className="focus:ring-3 h-4 w-4 rounded border-gray-300 bg-gray-50 focus:ring-blue-300"
							onChange={e =>
								setPeople(
									e.target.checked
										? assignedPeople.filter(x => x !== person.id)
										: [...assignedPeople, person.id],
								)
							}
						/>
						<label
							htmlFor={`checkbox-person-${person.id}`}
							className="ml-3 text-sm font-medium text-gray-900"
						>
							{person.name}
						</label>
					</div>
				))}
			</fieldset>

			<ErrorList errors={form.errors} id={form.errorId} />
			<div className="flex justify-end gap-4">
				<Button size="md" variant="secondary" type="reset">
					Reset
				</Button>
				<Button
					size="md"
					variant="primary"
					status={
						choreEditorFetcher.state === 'submitting'
							? 'pending'
							: choreEditorFetcher.data?.status ?? 'idle'
					}
					type="submit"
					disabled={choreEditorFetcher.state !== 'idle'}
				>
					Submit
				</Button>
			</div>
		</choreEditorFetcher.Form>
	)
}
