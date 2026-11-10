import React from 'react';
export const parseVnd=(value)=>Number(String(value||'').replace(/[^0-9]/g,''));
export const formatVnd=(value)=>String(value||'').replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
/** Display grouped VND digits, persist raw integer amounts to the API. */
export default function VndInput({value,onChange,...props}){
 return <input {...props} inputMode="numeric" type="text" value={formatVnd(value)} onChange={e=>{const digits=e.target.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');onChange(digits)}} />;
}
