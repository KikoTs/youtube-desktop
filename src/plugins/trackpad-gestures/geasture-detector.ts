export enum Gesture {
    UNKNOWN = 0,
    ZOOM,
    SCALE,
    SWIPE,
    SCROLL,
}

export enum Direction {
    NONE = 'none',
    LEFT = 'left',
    RIGHT = 'right',
    UP = 'up',
    DOWN = 'down',
    IN = 'in',
    OUT = 'out'
}

const enum Phase {
    kPhaseNone = 0,
    kPhaseBegan = 1 << 0,
    kPhaseStationary = 1 << 1,
    kPhaseChanged = 1 << 2,
    kPhaseEnded = 1 << 3,
    kPhaseCancelled = 1 << 4,
    kPhaseMayBegin = 1 << 5,
    kPhaseBlocked = 1 << 6,
}

interface GestureWheelEvent extends WheelEvent {
    phase: Phase
    momentumPhase: Phase
}

type EventNames = (
    | 'gesture-started'
    | 'gesture-detected'
    | 'gesture-in-progress'
    | 'gesture-ended'
)

interface EventData {
    gestureType: Gesture
    sumVertical: number
    sumHorizontal: number
    eventCount: number
    ctrlKey: boolean
    handle: boolean
    direction: Direction
}

export class GestureDetector {
    events = new EventTarget()
    gestureData: EventData = null
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
            direction: Direction.NONE,
        }
    }

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

    detectDirection(deltaX: number, deltaY: number): Direction {
        switch (this.gestureData.gestureType) {
            case Gesture.SWIPE:
                return deltaX > 0 ? Direction.LEFT : Direction.RIGHT
            
            case Gesture.SCROLL:
                return deltaY > 0 ? Direction.DOWN : Direction.UP
            
            case Gesture.SCALE:
                return deltaY > 0 ? Direction.OUT : Direction.IN
            
            default:
                return Direction.NONE
        }
    }

    handleWheelEvent({
        phase = Phase.kPhaseChanged,
        momentumPhase = Phase.kPhaseNone,
        deltaX,
        deltaY,
        ctrlKey,
    }: Partial<GestureWheelEvent> & WheelEvent) {
        // console.log('Wheel event's   , { phase, momentumPhase, deltaX, deltaY, ctrlKey })
    
        const absDeltaX = Math.abs(deltaX)
        const absDeltaY = Math.abs(deltaY)
        
        if (this.waitForAnotherStart) {
            if (absDeltaX > 20 || absDeltaY > 20) {
                this.handleEventStart(ctrlKey)
                
                this.gestureData.sumVertical -= deltaY
                this.gestureData.sumHorizontal -= deltaX
                this.gestureData.eventCount++
    
                const detectedEventType = this.detectEventType()
                if (detectedEventType !== Gesture.UNKNOWN) {
                    this.gestureData.gestureType = detectedEventType
                    this.gestureData.direction = this.detectDirection(deltaX, deltaY)
                    this.handleEventDetected()
                }
            }
            return
        }
    
        if (absDeltaX <= 1 && absDeltaY <= 1) {
            this.handleEventFinished()
            return
        }
    
        this.gestureData.sumVertical -= deltaY
        this.gestureData.sumHorizontal -= deltaX
        this.gestureData.eventCount++
    
        const detectedEventType = this.detectEventType()
    
        if (this.gestureData.gestureType === Gesture.UNKNOWN) {
            if (detectedEventType !== Gesture.UNKNOWN) {
                this.gestureData.gestureType = detectedEventType
                this.gestureData.direction = this.detectDirection(deltaX, deltaY)
                this.handleEventDetected()
            }
        } else if (this.gestureData.gestureType !== Gesture.UNKNOWN) {
            this.gestureData.direction = this.detectDirection(deltaX, deltaY)
            this.handleEventProgress()
        }
    }
}