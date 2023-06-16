// import { useWindowSize } from 'react-use'
import ReactConfetti from 'react-confetti'
import { useChoreContext } from '~/root.tsx'

export default function ChoreComplete() {
	// const { width, height } = useWindowSize()
	const choreContext = useChoreContext()

	function hide() {
		choreContext.choreComplete = false
	}
	return (
		// @ts-ignore
		<ReactConfetti
			className="!fixed"
			// width={width}
			// height={height}
			numberOfPieces={5000}
			recycle={false}
			onConfettiComplete={hide}
			colors={choreContext.choreColor ? [choreContext.choreColor] : undefined}
		/>
	)
}
