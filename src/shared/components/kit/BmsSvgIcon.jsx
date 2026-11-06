import React from 'react';
import { uiGlyphs } from './bmsIconMaps';
/** Always INLINE: currentColor must inherit from the button/link. No icon wrapper plate. */
export default function BmsSvgIcon({name, size=24, label, className='', ...props}) {
 if (!uiGlyphs[name]) throw new Error(`Unknown BMS UI icon: ${name}`);
 return <svg {...props} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`kit-icon ${className}`} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} focusable="false"><path d={uiGlyphs[name]}/></svg>;
}
