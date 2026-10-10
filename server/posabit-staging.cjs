"use strict";
// Server-only POSaBIT menu feed adapter. Never import this module into browser bundles.
// Official reference: https://developer.posabit.com/menu-feeds.html
const STAGING_ORIGIN = "https://staging-app.posabit.com";
function createPosabitAdapter({token,feedKey,fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
  if(typeof token!=="string"||!token.trim()||typeof feedKey!=="string"||!/^[a-zA-Z0-9_-]{1,128}$/.test(feedKey))throw Error("POSaBIT staging credentials are required");
  if(typeof fetchImpl!=="function")throw Error("fetch implementation required");
  return {async fetchMenu(){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(STAGING_ORIGIN+"/api/v3/menu_feeds/"+encodeURIComponent(feedKey),{
        method:"GET",headers:{Authorization:"Bearer "+token,"Accept":"application/json"},signal:controller.signal,redirect:"error"
      });
      if(!response.ok)throw Error("POSaBIT staging request failed: HTTP "+response.status);
      const payload=await response.json();
      if(!payload||typeof payload!=="object"||Array.isArray(payload))throw Error("Invalid POSaBIT menu payload");
      return payload;
    }finally{clearTimeout(timer)}
  }};
}
module.exports={createPosabitAdapter,STAGING_ORIGIN};
