import React from 'react';
import BmsPackageIcon from './BmsPackageIcon';
import BmsCta from './BmsCta';
/** Host owns normalization, API data, translated labels, click behavior and currency. */
export default function BmsServiceCard({pkg, category='general', formattedPrice, labels, onBook, onDetail, base}) {
 return <article className="kit-card" style={{display:'flex',flexDirection:'column',gap:14}}><BmsPackageIcon name={category} base={base}/><div><span className="kit-chip">{pkg.category}</span></div><h3 style={{margin:0}}>{pkg.packageName}</h3><p className="kit-muted">{pkg.description}</p><div className="kit-panel">{[pkg.sampleTube,pkg.tat,pkg.fastingRule].filter(Boolean).map((value,i)=><div key={i}>{value}</div>)}</div><div style={{marginTop:'auto'}}><strong className="kit-num">{formattedPrice}</strong><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>{onDetail && <BmsCta tone="neutral" icon="external" onClick={()=>onDetail(pkg)}>{labels.details}</BmsCta>}<BmsCta tone="mint" icon="calendar-check" onClick={()=>onBook(pkg)}>{labels.book}</BmsCta></div></div></article>;
}
