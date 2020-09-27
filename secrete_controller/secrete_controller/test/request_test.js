/**
 *  node test/request_test.js
 */
const {
    uploadSecret, 
    genEncryptedSecret, 
    getPublicKey,
    deleteSecret,} = require('../app').module

const handler = require('../app').handler
const axios = require('axios')

//----------------------test1-----------------
console.log('----------------test1----------------')
const event = {
    body: JSON.stringify({
        option: 'create',
        userName: 'user1',
        repo: 'test',
        token: 'test-token',
        password: 'test-password',
        secrets: {
            secret1: 'abc',
            secret2: 'bcd'
        }
    })
}
const response1 = {
    'statusCode': 412,
        'body': JSON.stringify({
            message: 'Precondition Failed'
    })
}
handler(event)
.then(res => {
    //if (res!==response1) throw 'test failed'
    for (let index in res){
        if (res[index]!==response1[index]) throw 'test faild'
    }
    console.log('test1 succeed!')
})
.catch(err=>{
    console.error('test1 failed')
})

// ---------------------test2-----------------
console.log('--------------test2-----------------')
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
    //console.error(err.message)
})
// ----------------------test3-----------------------------------------
console.log('----------------------test3------------------------')
const url = 'https://ocq2zcfiy2.execute-api.eu-central-1.amazonaws.com/Prod/secrete_controller'
axios.post(url, {
    //token: token,
    userName: 'wangziling100',
    password: 'test',
    option: 'delete',
    repo: 'lambdas',
    secrets: {
        TEST1: 'test'
    }
})
.then(res=>{
    console.log(res)
})
.catch(err=>{
    console.error(err)
})
