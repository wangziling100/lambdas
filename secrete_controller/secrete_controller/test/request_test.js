/**
 *  node test/request_test.js
 */
const {
    uploadSecret, 
    genEncryptedSecret, 
    getPublicKey,
    deleteSecret,} = require('../app').module

let token
try{
    token = require('./env').TOKEN
}
catch{
    token = process.env.TOKEN
}
getPublicKey(token, 'wangziling100', 'lambdas')
.then(key => {
    //console.log(key, 'key 1')
    return key
})
.then(keyInfo => {
    const key = keyInfo.key 
    const keyId = keyInfo.key_id
    //console.log(key, keyId, 'key')
    const encrypted = genEncryptedSecret(key, 'test')
    //console.log(encrypted, 'encrypted value')
    const resp = uploadSecret(token, encrypted, 'TEST', keyId, 'wangziling100', 'lambdas')
    return resp
})
.then(resp => {
    console.log(resp)
    if(resp!==204 && resp!==201) throw new Error('Wrong status code')
})

deleteSecret(token, 'TEST', 'wangziling100', 'lambdas')
.then(resp => {
    console.log(resp)
})
.catch(err => {
    console.error(err.message)
})