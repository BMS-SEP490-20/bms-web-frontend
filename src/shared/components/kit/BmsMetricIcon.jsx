import React from 'react';
import BmsArt from './BmsArt';
import { metricIcons } from './bmsIconMaps';
export default function BmsMetricIcon({name, size=56, ...props}) {
 if (!metricIcons[name]) throw new Error(`Unknown metric icon: ${name}`);
 return <BmsArt {...props} src={metricIcons[name]} width={size} height={size} style={{width:size,height:size}} />;
}
