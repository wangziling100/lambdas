const handler = require('../app').handler
const {
    genEncryptedSecret, 
    checkInput, 
    setResponse,
} = require('../app').module
const nacl = require('tweetnacl')
//jest.mock('axios')
let token
try{
    token = require('./env').TOKEN
}
catch{
    token = process.env.TOKEN
}
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
const response2 = {
    'statusCode': 200,
        'body': JSON.stringify({
            message: 'OK'
    })
}
/*
test('handler', ()=>{
    expect(handler(event)).toEqual(response2)
})
*/

test('function', ()=>{
    const keyPair = nacl.box.keyPair()
    console.log(genEncryptedSecret(keyPair.publicKey, 'abac'))
})

test('check input', ()=>{
    const body1 = {
        option: 'create',
        userName: 'user1',
        repo: 'test',
        token: 'test-token',
        password: 'test-password',
        secrets: {
            secret1: 'abc',
            secret2: 'bcd'
        }
    }
    const body2 = {
        option: 'create'
    }
    const body3 = {
        option: 'create',
        password: 'test-password',
        userName: 'user1',
        repo: 'test',
        secrets: {
            secret1: 'abc'
        }
    }
    expect(checkInput(body1)).toEqual(body1)
    expect(checkInput(body2)).toEqual(null)
    expect(checkInput(body3)).toEqual(body3)

})

test('set response', ()=>{
    
    expect(setResponse(false)).toEqual(response1)
    expect(setResponse(true)).toEqual(response2)
})

