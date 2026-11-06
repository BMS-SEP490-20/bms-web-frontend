import React from 'react';
/** Public base points at the copied assets/svg directory, NOT the repository root. */
export default function BmsArt({src, base='/assets/bms/svg', alt='', width, height, className='', loading='lazy', decoding='async', ...props}) {
 return <img {...props} className={`kit-art ${className}`} src={`${base.replace(/\/$/, '')}/${src}`} alt={alt} width={width} height={height} loading={loading} decoding={decoding} />;
}
