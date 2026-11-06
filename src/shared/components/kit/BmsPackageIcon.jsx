import React from 'react';
import BmsArt from './BmsArt';
import { categoryIcons } from './bmsIconMaps';
export default function BmsPackageIcon({name='general', size=80, ...props}) {
 return <BmsArt {...props} src={categoryIcons[name] || categoryIcons.general} width={size} height={size} style={{width:size,height:size}}/>;
}
