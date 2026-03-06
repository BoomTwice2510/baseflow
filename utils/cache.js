let cache = null
let lastUpdate = 0

const CACHE_TIME = 60000 // 60 sec

export function getCache(){
 return cache
}

export function setCache(data){
 cache = data
 lastUpdate = Date.now()
}

export function isExpired(){
 return Date.now() - lastUpdate > CACHE_TIME
}