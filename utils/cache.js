let cache = null
let lastUpdate = 0

export function getCache(){

 return cache

}

export function setCache(data){

 cache = data
 lastUpdate = Date.now()

}

export function isExpired(){

 return Date.now()-lastUpdate > 120000

}