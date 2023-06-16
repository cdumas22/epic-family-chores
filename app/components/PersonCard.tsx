import type { SerializeFrom } from '@remix-run/node'
import { Form, Link } from '@remix-run/react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import { useChoreContext } from '~/root.tsx'
import type { PersonLoader } from '~/routes/_chores+/index.tsx'

type Person = SerializeFrom<PersonLoader>[number]

export function ChoreLabel({
	chore,
}: {
	chore: Person['chores'][string][number]
}) {
	return (
		<div className="flex items-center gap-3">
			{chore.icon ? (
				<div className="text-2xl">{chore.icon}</div>
			) : (
				<span className="text-3xl ">{chore.completed ? '✔' : '✔️'}</span>
			)}
			<span
				className={`pl-1 text-2xl ${chore.completed ? 'line-through' : ''}`}
			>
				{chore.title}
			</span>
		</div>
	)
}

export default function PersonCard({ person }: { person: Person }) {
	const allChores = Object.values(person.chores).flat()
	const done = allChores.filter(x => x.completed)
	const percentage = (done.length / allChores.length) * 100
	const choreContext = useChoreContext()
	const listStyles = {
		borderLeftWidth: '5px',
		borderLeftColor: person.color,
	}
	const buttonStyles = {
		border: 'none',
		background: 'none',
		width: '100%',
		textAlign: 'left',
	}
	function onDone() {
		choreContext.choreComplete = true
		choreContext.choreColor = person.color
	}

	return (
		<div className="relative flex h-full basis-80 flex-col rounded border bg-slate-400">
			<div className="flex-initial p-4">
				<Link className="absolute right-1 top-1" to={`/person/${person.id}`}>
					✏️
				</Link>
				<div className="m-auto flex w-28">
					<CircularProgressbar
						value={percentage}
						text={person.name}
						styles={buildStyles({
							strokeLinecap: 'round',
							pathColor: person.color,
							textColor: person.color,
						})}
					/>
				</div>
				<div className="text-center opacity-80">
					{done.length} of {allChores.length} Complete
				</div>
			</div>
			<div style={{ overflow: 'auto' }} className="p-3 pt-0">
				{allChores.length === 0 ? (
					<div className="fs-4 text-center">🎉 No Chores TODAY 🎉 </div>
				) : (
					<div>
						{Object.entries(person.chores).map(([key, chores]) => (
							<div key={key}>
								<div className="text-sm font-bold uppercase opacity-80">
									{key}
								</div>
								{chores.filter(x => !x.completed).length ? (
									<div className="rounded border">
										{chores
											.filter(x => !x.completed)
											.map(chore => (
												<div
													key={chore.id}
													style={listStyles}
													className="flex justify-between border px-4 py-3"
												>
													<Form method="put" className="block h-full w-full">
														<input
															hidden
															name="complete"
															defaultValue={chore.id}
														/>
														<button
															style={buttonStyles as any}
															type="submit"
															onClick={onDone}
														>
															<ChoreLabel chore={chore} />
														</button>
													</Form>
												</div>
											))}
									</div>
								) : (
									<div className="fs-3 text-center text-lg">
										🎉 All Done 🎉{' '}
									</div>
								)}
							</div>
						))}
						<hr />
						<div className="text-sm font-bold uppercase opacity-80">
							COMPLETED
						</div>
						{done.length ? (
							<div className="rounded border">
								{done.map(chore => (
									<div
										key={chore.id}
										style={listStyles}
										className="flex justify-between border px-4 py-3"
									>
										<Form method="put" className="d-block w-100 h-100">
											<input hidden name="complete" defaultValue={chore.id} />
											<button
												style={buttonStyles as any}
												type="submit"
												className="text-muted"
											>
												<ChoreLabel chore={chore} />
											</button>
										</Form>
									</div>
								))}
							</div>
						) : (
							<div>Get working!</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
