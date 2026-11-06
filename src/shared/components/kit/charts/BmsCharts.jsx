import React from 'react';
import BmsArt from '../BmsArt';
const names=['coldchain-temp-strip','donut-breakdown','trend-line','qc-pass-gauge','volume-bars','levey-jennings','tat-sla-ring','tracking-stepper'];
/** Static examples ONLY. Keep real readings/timestamps/axes in a live chart and HTML table. */
export function BmsChartExample({name, caption, base}) {
 if (!names.includes(name)) throw new Error(`Unknown chart example: ${name}`);
 return <figure style={{margin:0}}><BmsArt src={`charts/${name}.svg`} base={base}/><figcaption>{caption}</figcaption></figure>;
}
