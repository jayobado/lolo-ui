type CSSValue = string | number

export interface StyleProperties {
	display?: string
	flexDirection?: string
	flexWrap?: string
	flex?: CSSValue
	flexGrow?: CSSValue
	flexShrink?: CSSValue
	flexBasis?: CSSValue
	alignItems?: string
	alignSelf?: string
	justifyContent?: string
	justifySelf?: string
	gap?: CSSValue
	rowGap?: CSSValue
	columnGap?: CSSValue
	gridTemplateColumns?: string
	gridTemplateRows?: string
	gridColumn?: CSSValue
	gridRow?: CSSValue
	width?: CSSValue
	minWidth?: CSSValue
	maxWidth?: CSSValue
	height?: CSSValue
	minHeight?: CSSValue
	maxHeight?: CSSValue
	padding?: CSSValue
	paddingTop?: CSSValue
	paddingRight?: CSSValue
	paddingBottom?: CSSValue
	paddingLeft?: CSSValue
	paddingInline?: CSSValue
	paddingBlock?: CSSValue
	margin?: CSSValue
	marginTop?: CSSValue
	marginRight?: CSSValue
	marginBottom?: CSSValue
	marginLeft?: CSSValue
	marginInline?: CSSValue
	marginBlock?: CSSValue
	position?: string
	top?: CSSValue
	right?: CSSValue
	bottom?: CSSValue
	left?: CSSValue
	zIndex?: CSSValue
	inset?: CSSValue
	fontSize?: CSSValue
	fontWeight?: CSSValue
	fontFamily?: string
	fontStyle?: string
	lineHeight?: CSSValue
	letterSpacing?: CSSValue
	textAlign?: string
	textDecoration?: string
	textTransform?: string
	textOverflow?: string
	whiteSpace?: string
	color?: string
	background?: string
	backgroundColor?: string
	backgroundImage?: string
	border?: string
	borderTop?: string
	borderRight?: string
	borderBottom?: string
	borderLeft?: string
	borderRadius?: CSSValue
	borderColor?: string
	borderWidth?: CSSValue
	borderStyle?: string
	outline?: string
	outlineOffset?: CSSValue
	boxShadow?: string
	opacity?: CSSValue
	overflow?: string
	overflowX?: string
	overflowY?: string
	cursor?: string
	pointerEvents?: string
	userSelect?: string
	visibility?: string
	transform?: string
	transformOrigin?: string
	transition?: string
	animation?: string
	filter?: string
	backdropFilter?: string
	willChange?: string
	clipPath?: string
	appearance?: string
	resize?: string
	listStyle?: string
	objectFit?: string
	verticalAlign?: string
	content?: string
	boxSizing?: string
	aspectRatio?: string
	wordBreak?: string
}

export interface StyleObject extends StyleProperties {
	pseudo?: Record<string, StyleProperties>
	media?: Record<string, StyleProperties>
}

const ruleCache = new Map<string, string>()
const injected = new Set<string>()
let counter = 0
let styleSheet: CSSStyleSheet | null = null

function getSheet(): CSSStyleSheet {
	if (styleSheet) return styleSheet
	const el = document.createElement('style')
	el.id = '__ts-ui__'
	document.head.appendChild(el)
	styleSheet = el.sheet as CSSStyleSheet
	return styleSheet
}

function genClass(): string {
	return `_${(counter++).toString(36)}`
}

function kebab(prop: string): string {
	return prop.replace(/([A-Z])/g, '-$1').toLowerCase()
}

const unitless = new Set([
	'animationIterationCount', 'columnCount', 'flexGrow', 'flexShrink',
	'fontWeight', 'gridColumn', 'gridRow', 'lineHeight', 'opacity',
	'order', 'zIndex',
])

function toValue(prop: string, value: CSSValue): string {
	if (typeof value === 'number' && value !== 0 && !unitless.has(prop)) {
		return `${value}px`
	}
	return String(value)
}

function injectRule(className: string, rule: string): void {
	if (injected.has(className)) return
	injected.add(className)
	try {
		getSheet().insertRule(rule, getSheet().cssRules.length)
	} catch { /* skip invalid rules */ }
}

function registerProperty(
	prop: string,
	value: CSSValue,
	selector: (cls: string) => string,
	keyPrefix: string
): string {
	const key = `${keyPrefix}:${prop}:${value}`
	if (!ruleCache.has(key)) {
		const cls = genClass()
		const decl = `${kebab(prop)}:${toValue(prop, value)}`
		const rule = `${selector(cls)}{${decl}}`
		ruleCache.set(key, cls)
		injectRule(cls, rule)
	}
	return ruleCache.get(key)!
}

export function css(styles: StyleObject): string {
	const classes: string[] = []
	const { pseudo, media, ...base } = styles

	for (const [prop, value] of Object.entries(base)) {
		if (value == null) continue
		classes.push(registerProperty(prop, value as CSSValue, cls => `.${cls}`, 'b'))
	}

	if (pseudo) {
		for (const [pseudoSel, props] of Object.entries(pseudo)) {
			for (const [prop, value] of Object.entries(props)) {
				if (value == null) continue
				classes.push(
					registerProperty(prop, value as CSSValue, cls => `.${cls}${pseudoSel}`, `p:${pseudoSel}`)
				)
			}
		}
	}

	if (media) {
		for (const [query, props] of Object.entries(media)) {
			for (const [prop, value] of Object.entries(props)) {
				if (value == null) continue
				const key = `m:${query}:${prop}:${value}`
				if (!ruleCache.has(key)) {
					const cls = genClass()
					const decl = `${kebab(prop)}:${toValue(prop, value)}`
					const rule = `@media ${query}{.${cls}{${decl}}}`
					ruleCache.set(key, cls)
					injectRule(cls, rule)
				}
				classes.push(ruleCache.get(key)!)
			}
		}
	}

	return classes.join(' ')
}

export interface FontFace {
	family: string
	src: string
	weight?: CSSValue
	style?: string
	display?: string
}

export interface KeyframeBlock {
	[stop: string]: StyleProperties
}

export function globalStyles(
	rules: Record<string, StyleProperties | Record<string, CSSValue>>,
	fonts?: FontFace[],
	keyframes?: Record<string, KeyframeBlock>,
): void {
	const sheet = getSheet()

	if (fonts) {
		for (const font of fonts) {
			const declarations = [
				`font-family:${font.family}`,
				`src:${font.src}`,
				font.weight != null ? `font-weight:${font.weight}` : '',
				font.style ? `font-style:${font.style}` : '',
				`font-display:${font.display ?? 'swap'}`,
			].filter(Boolean).join(';')
			try {
				sheet.insertRule(`@font-face{${declarations}}`, sheet.cssRules.length)
			} catch { /* skip invalid */ }
		}
	}

	if (keyframes) {
		for (const [name, stops] of Object.entries(keyframes)) {
			const body = Object.entries(stops)
				.map(([stop, props]) => {
					const decls = Object.entries(props)
						.filter(([_, v]) => v != null)
						.map(([p, v]) => {
							if (p.startsWith('--')) return `${p}:${v}`
							return `${kebab(p)}:${toValue(p, v as CSSValue)}`
						})
						.join(';')
					return `${stop}{${decls}}`
				})
				.join('')
			try {
				sheet.insertRule(`@keyframes ${name}{${body}}`, sheet.cssRules.length)
			} catch { /* skip invalid */ }
		}
	}

	for (const [selector, props] of Object.entries(rules)) {
		const declarations = Object.entries(props)
			.filter(([_, v]) => v != null)
			.map(([prop, value]) => {
				if (prop.startsWith('--')) return `${prop}:${value}`
				return `${kebab(prop)}:${toValue(prop, value as CSSValue)}`
			})
			.join(';')
		if (!declarations) continue
		try {
			sheet.insertRule(`${selector}{${declarations}}`, sheet.cssRules.length)
		} catch { /* skip invalid */ }
	}
}