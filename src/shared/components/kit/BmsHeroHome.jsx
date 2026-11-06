import React from 'react';
import BmsArt from './BmsArt';
/** Narrative + live tracker stay DOM components. This does not invent patient data. */
export default function BmsHeroHome({narrative, tracker, metrics, base}) {
 return <section className="kit-section"><div className="kit-hero"><div>{narrative}<BmsArt base={base} src="hero/home/hero-lab-composition.svg" loading="eager" width={640} height={400}/></div><aside className="kit-card">{tracker}</aside></div>{metrics && <div className="kit-grid">{metrics}</div>}</section>;
}
