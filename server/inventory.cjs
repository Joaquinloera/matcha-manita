"use strict";
// Normalized inventory snapshots. Unverified or stale feeds must never imply live stock.
function normalizeInventory(products,{syncedAt=new Date().toISOString(),maxAgeMs=300000,now=Date.now()}={}){
  if(!Array.isArray(products))throw Error("Inventory products must be an array");
  const timestamp=Date.parse(syncedAt);
  if(!Number.isFinite(timestamp)||timestamp>now||now-timestamp>maxAgeMs)throw Error("Inventory snapshot is stale or invalid");
  const seen=new Set();
  const items=products.map(p=>{
    if(!p||typeof p.id!=="string"||!p.id.trim()||typeof p.name!=="string"||!p.name.trim())throw Error("Invalid inventory product");
    if(seen.has(p.id))throw Error("Duplicate inventory product id");
    seen.add(p.id);
    if(!Number.isInteger(p.quantity)||p.quantity<0)throw Error("Invalid inventory quantity");
    if(typeof p.price!=="number"||!Number.isFinite(p.price)||p.price<0)throw Error("Invalid inventory price");
    return {id:p.id,name:p.name,quantity:p.quantity,price:p.price,available:p.quantity>0};
  });
  return {source:"staging",verifiedLive:false,syncedAt,items};
}
module.exports={normalizeInventory};
