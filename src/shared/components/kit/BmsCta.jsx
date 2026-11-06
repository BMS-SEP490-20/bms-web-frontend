import React from 'react';
import BmsSvgIcon from './BmsSvgIcon';
/** Keep translated visible label in the host, never in SVG. */
export default function BmsCta({children, icon='arrow-right', tone='blue', as:Tag='button', className='', ...props}) {
 return <Tag type={Tag==='button' ? 'button' : undefined} {...props} className={`kit-cta ${tone==='mint' ? 'kit-cta--mint' : tone==='neutral' ? 'kit-cta--neutral' : ''} ${className}`}>{children}{icon && <BmsSvgIcon name={icon} size={18}/>}</Tag>;
}
