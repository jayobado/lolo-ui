import { defineElement } from '../core/element.ts'
import type {
	CircleProps,
	ClipPathProps,
	DefsProps,
	EllipseProps,
	FilterPrimitiveProps,
	FilterProps,
	ForeignObjectProps,
	GroupProps,
	LineProps,
	LinearGradientProps,
	MarkerProps,
	MaskProps,
	PathProps,
	PatternProps,
	PolygonProps,
	PolylineProps,
	RadialGradientProps,
	RectProps,
	StopProps,
	SvgImageProps,
	SvgRootProps,
	SvgTextProps,
	SymbolProps,
	TspanProps,
	UseProps,
} from './dom-types.ts'

/**
 * The `svg` namespace — every SVG element as a typed factory.
 *
 * Usage:
 *   import { svg } from '@jayobado/lolo-ui'
 *   const { circle, rect, path } = svg
 *
 *   svg.svg({ viewBox: '0 0 100 100', width: 200 },
 *     circle({ cx: 50, cy: 50, r: 40, fill: 'blue' }),
 *     rect({ x: 10, y: 10, width: 20, height: 20 }),
 *   )
 *
 * Why a separate namespace from `el`:
 *   - SVG and HTML share several tag names (`text`, `title`, `style`,
 *     `script`, `a`, `image`, `filter`) with different semantics.
 *     `svg.text` is the SVG text element; `el.span` is HTML.
 *   - Per-element prop types catch SVG-on-HTML errors (e.g. setting
 *     `cx` on an HTML element) at compile time.
 *   - The renderer uses the namespace hint to call `createElementNS`
 *     with the SVG URI, which is required for SVG to actually render.
 */
export const svg = {
	// Root and structural
	svg: defineElement<SvgRootProps>('svg', 'svg'),
	g: defineElement<GroupProps>('g', 'svg'),
	defs: defineElement<DefsProps>('defs', 'svg'),
	symbol: defineElement<SymbolProps>('symbol', 'svg'),
	use: defineElement<UseProps>('use', 'svg'),

	// Basic shapes
	circle: defineElement<CircleProps>('circle', 'svg'),
	ellipse: defineElement<EllipseProps>('ellipse', 'svg'),
	rect: defineElement<RectProps>('rect', 'svg'),
	line: defineElement<LineProps>('line', 'svg'),
	polyline: defineElement<PolylineProps>('polyline', 'svg'),
	polygon: defineElement<PolygonProps>('polygon', 'svg'),
	path: defineElement<PathProps>('path', 'svg'),

	// Text
	text: defineElement<SvgTextProps>('text', 'svg'),
	tspan: defineElement<TspanProps>('tspan', 'svg'),

	// Embedded
	image: defineElement<SvgImageProps>('image', 'svg'),
	foreignObject: defineElement<ForeignObjectProps>('foreignObject', 'svg'),

	// Gradients and patterns
	linearGradient: defineElement<LinearGradientProps>('linearGradient', 'svg'),
	radialGradient: defineElement<RadialGradientProps>('radialGradient', 'svg'),
	stop: defineElement<StopProps>('stop', 'svg'),
	pattern: defineElement<PatternProps>('pattern', 'svg'),

	// Markers and clipping
	marker: defineElement<MarkerProps>('marker', 'svg'),
	clipPath: defineElement<ClipPathProps>('clipPath', 'svg'),
	mask: defineElement<MaskProps>('mask', 'svg'),

	// Filters
	filter: defineElement<FilterProps>('filter', 'svg'),
	feGaussianBlur: defineElement<FilterPrimitiveProps>('feGaussianBlur', 'svg'),
	feOffset: defineElement<FilterPrimitiveProps>('feOffset', 'svg'),
	feBlend: defineElement<FilterPrimitiveProps>('feBlend', 'svg'),
	feFlood: defineElement<FilterPrimitiveProps>('feFlood', 'svg'),
	feMerge: defineElement<FilterPrimitiveProps>('feMerge', 'svg'),
	feMergeNode: defineElement<FilterPrimitiveProps>('feMergeNode', 'svg'),
	feColorMatrix: defineElement<FilterPrimitiveProps>('feColorMatrix', 'svg'),
	feComposite: defineElement<FilterPrimitiveProps>('feComposite', 'svg'),
} as const