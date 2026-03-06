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

 if(!cache) return true

 const ttl = 120000

 return Date.now() - lastUpdate > ttl

}