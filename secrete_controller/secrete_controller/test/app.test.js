const handler = require('../app').handler
const {genEncryptedSecret, getPublicKey} = require('../app').module
const nacl = require('tweetnacl')
const axios = require('axios').default;
//jest.mock('axios')
let token
try{
    token = require('./env').TOKEN
}
catch{
    token = process.env.TOKEN
}
console.log(token, 'token')
const event = {
    body: JSON.stringify({
        option: 'create',
        userName: 'user1',
        repo: '-',
        token: 'test-token',
        password: 'test-password',
        secrets: {
            secret1: 'abc',
            secret2: 'bcd'
        }
    })
}
test('handler', ()=>{
    expect(handler(event)).toEqual({
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello World!'
        })
    })
})

test('function', ()=>{
    const keyPair = nacl.box.keyPair()
    console.log(genEncryptedSecret(keyPair.publicKey, 'abac'))
})

test('fetch public key', ()=>{
    //await expect(getPublicKey(token, 'AutoPublishTest')).rejects.toThrow('akj');
    getPublicKey(token, 'AutoPublishTest')
    .then(res => {console.log(res, 'response')})
    .catch(err => console.log(err.message))
    /*
    const resp = {test:123}
    axios.get.mockResolvedValue(resp)
    return getPublicKey(token, 'AutoPublishTest').then(data=>{
        expect(data).toEqual(resp)
    })
    */
})