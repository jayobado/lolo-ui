export interface Text {
	type: 'text'
	content: string | (() => string)
	variant?: string
}

export interface Badge {
	type: 'badge'
	label: string | (() => string)
	variant?: string
}

export interface Image {
	type: 'image'
	src: string | (() => string)
	alt: string
	width?: number
	height?: number
}

export type Display = Text | Badge | Image