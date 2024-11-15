
export enum Gesture {
    UNKNOWN = 0,
    ZOOM,
    SCALE,
    SWIPE,
    SCROLL,
}

export const enum Phase {
    // No phase information is avaiable.
    kPhaseNone = 0,
    // This wheel event is the beginning of a scrolling sequence.
    kPhaseBegan = 1 << 0,
    // Shows that scrolling is ongoing but the scroll delta for this wheel event
    // is zero.
    kPhaseStationary = 1 << 1,
    // Shows that a scroll is ongoing and the scroll delta for this wheel event
    // is non-zero.
    kPhaseChanged = 1 << 2,
    // This wheel event is the last event of a scrolling sequence.
    kPhaseEnded = 1 << 3,
    // A wheel event with phase cancelled shows that the scrolling sequence is
    // cancelled.
    kPhaseCancelled = 1 << 4,
    // A wheel event with phase may begin shows that a scrolling sequence may
    // start.
    kPhaseMayBegin = 1 << 5,
    // A wheel event with momentum phase blocked shows that a scrolling sequence
    // will not be followed by a momentum fling. This should only ever be set on
    // the momentum phase of an event.
    kPhaseBlocked = 1 << 6,
}

export interface GestureWheelEvent extends WheelEvent {
    phase: Phase
    momentumPhase: Phase
}

export type EventNames = (
    | 'gesture-started'
    | 'gesture-detected'
    | 'gesture-in-progress'
    | 'gesture-ended'
)

export interface EventData {
    gestureType: Gesture
    sumVertical: number // Horizontal
    sumHorizontal: number // Vertical
    eventCount: number
    ctrlKey: boolean
    handle: boolean
}

export class GestureDetector {
    events = new EventTarget()
    gestureData: EventData = null
    // gestureData = null
    waitForAnotherStart = true

    addEventListener(eventName: EventNames, listener: (event: CustomEvent<EventData>) => void): void {
        this.events.addEventListener(eventName, listener)
    }

    removeEventListener(eventName: EventNames, listener: (event: CustomEvent<EventData>) => void): void {
        this.events.removeEventListener(eventName, listener)
    }

    constructor() {
        this.resetGestureData()

        window.addEventListener('wheel', this.handleWheelEvent.bind(this), { passive: true })
    }

    resetGestureData() {
        this.gestureData = {
            gestureType: Gesture.UNKNOWN,
            ctrlKey: false,
            sumVertical: 0,
            sumHorizontal: 0,
            eventCount: 0,
            handle: false,
        }
    }

    // handleEventStart(ctrlKey) {
    handleEventStart(ctrlKey: boolean) {
        this.resetGestureData()
        this.gestureData.ctrlKey = ctrlKey
        this.waitForAnotherStart = false
        this.events.dispatchEvent(new CustomEvent<EventData>('gesture-started'))
    }

    handleEventDetected() {
        this.events.dispatchEvent(new CustomEvent<EventData>('gesture-detected', { detail: this.gestureData }))
    }

    handleEventProgress() {
        this.events.dispatchEvent(new CustomEvent<EventData>('gesture-in-progress', { detail: this.gestureData }))
    }

    handleEventEnded(shouldHandle: boolean) {
        this.waitForAnotherStart = true
        this.gestureData.handle = shouldHandle

        const event = new CustomEvent<EventData>('gesture-ended', { detail: this.gestureData })

        this.events.dispatchEvent(event)
        this.gestureData = null
    }

    handleEventCancel() {
        this.handleEventEnded(false)
    }

    handleEventFinished() {
        this.handleEventEnded(true)
    }

    detectEventType() {
        const absVertical = Math.abs(this.gestureData?.sumVertical)
        const absHorizontal = Math.abs(this.gestureData?.sumHorizontal)

        if (this.gestureData.ctrlKey && absVertical && !absHorizontal) {
            /**
             * TODO: Find a way to separate wheel+ctr and two-finder-pinch.
             * They are as far as I know identical in many ways
             */

            return Gesture.SCALE
        }

        if (absVertical * 2 < absHorizontal) {
            return Gesture.SWIPE
        }

        if (absHorizontal * 2 < absVertical) {
            return Gesture.SCROLL
        }

        return Gesture.UNKNOWN
    }

    handleWheelEvent({
        phase, momentumPhase,
        deltaX, deltaY,
        ctrlKey,
    // }) {
    }: GestureWheelEvent) {
        if (phase === Phase.kPhaseBegan) { // Gesture begining
            return this.handleEventStart(ctrlKey)
        }

        if (this.waitForAnotherStart) return // Ignore events

        if (phase === Phase.kPhaseCancelled) {
            return this.handleEventCancel()
        }

        /**
         * When momentum movement starts, it delays the regular phase end until the momentum ends
         * In this case, we consider momentum start phase as regulas phase end
         */
        if (phase === Phase.kPhaseEnded || momentumPhase === Phase.kPhaseBegan) { // Gesture ended
            return this.handleEventFinished()
        }

        // After this point, ignore all phases other than kPhaseChanged
        if (phase !== Phase.kPhaseChanged && momentumPhase !== Phase.kPhaseChanged) return

        // No momentum events allowed after this point
        if (momentumPhase !== Phase.kPhaseNone) return

        if (phase === Phase.kPhaseChanged || phase === Phase.kPhaseStationary) {
            // Invert numbers to have more graph-like X/Y movements
            this.gestureData.sumVertical -= deltaY
            this.gestureData.sumHorizontal -= deltaX
            this.gestureData.eventCount++

            const detectedEventType = this.detectEventType()

            // Detect EventType type
            if (this.gestureData.gestureType === Gesture.UNKNOWN) {
                if (detectedEventType !== Gesture.UNKNOWN) {
                    this.gestureData.gestureType = detectedEventType
                    this.handleEventDetected()
                // Detect conditions to cancel gestures
                } else if (this.gestureData.gestureType !== detectedEventType) {
                    // TODO: Here is the point where Win and Mac behaviour diverge
                    // Win: Continues detecting type gesture ends
                    // Mac: Stops detecting once script changes the detection result
                    // Pick what you want here :)

                    // return this.handleEventCancel()
                }
            }

            // Gesture identified and is in progress
            if (this.gestureData.gestureType !== Gesture.UNKNOWN) {
                return this.handleEventProgress()
            }

            return
        }

        throw new Error(`Unknown phase configuration ${JSON.stringify({ phase, momentumPhase })}`)
    }
}