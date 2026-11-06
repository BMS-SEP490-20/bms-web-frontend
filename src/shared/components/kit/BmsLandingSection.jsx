import React from 'react';
import BmsArt from './BmsArt';
export default function BmsLandingSection({asset, heading, children, reverse=false, base}) {
 return <section className="kit-section kit-hero"><div style={{order:reverse?2:0}}><h2>{heading}</h2><div className="kit-muted">{children}</div></div><BmsArt base={base} src={asset} width={320} height={200}/></section>;
}
