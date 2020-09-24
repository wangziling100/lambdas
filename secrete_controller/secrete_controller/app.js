const sodium = require('tweetsodium');
const util = require('tweetnacl-util');
const axios = require('axios');
const { resolve } = require('path');
let bucketName, dynamo, s3, Auth, https

try{
    bucketName = process.env.BUCKET_NAME
    const AWS = require('aws-sdk');
    dynamo = new AWS.DynamoDB.DocumentClient({region: 'eu-central-1'})
    s3 = new AWS.S3()
    Auth = require('@octokit/auth')
    https = require('https')
}
catch(err){
    console.error(err.message)
}

exports.handler= (event, context) =>{
    const body = JSON.parse(event.body)
    const option = body.option
    let token = body.token
    const password = body.password
    const secrets = body.secrets
    const userName = body.userName
    const repo = body.repo
    console.log(option, token, password, secrets, userName, repo)
    try{
        token = getToken(userName, password, token)
    }
    catch(err){
        console.error(err.message)
    }
    const response = {
        'statusCode': 200,
        'body': JSON.stringify({
            message: 'Hello World!'
        })
    }
    return response
}


async function getToken(userName, password, token){
    if (token !== null || token !== undefined){
        await storeInDB(userName, password, token)
    }
    else{
        const [ succeed, token ] = getTokenFromDB(userName, password)
    }
    return token
}

async function storeInDB(userName, password, token){
    const params = {
        TableName: 'GithubTokens',
        Item: {
            userName: userName,
            password: password,
            token: token,
        }
    }
    await dynamo.put(params).promise()
}

async function getTokenFromDB(userName, password){
    const params = {
        TableName: 'GithubTokens',
        Key:{
            userName: userName,
            password: password
        }
    }
    let result = null
    await dynamo.get(params).promise()
    .then((obj) => {
        if (obj.Item===undefined) {
        }
        else {
            
            result = obj.Item.token
        }
    })
    .catch((err) => {
        console.log(err)
    })
    return result
}

function genEncryptedSecret(key, value){
    // Convert the message and key to Uint8Array's (Buffer implements that interface)
    let messageBytes;
    if (typeof(key)==='string'){
        key = Buffer.from(key, 'base64');
        messageBytes = Buffer.from(value)
    }
    else{
        messageBytes = util.decodeUTF8(value)
    }

    // Encrypt using LibSodium.
    const encryptedBytes = sodium.seal(messageBytes, key);

    // Base64 the encrypted secret
    const encrypted = Buffer.from(encryptedBytes).toString('base64');

    return encrypted
}

async function getPublicKey(token, userName, repo){
    let result
    const url = 'https://api.github.com/repos/'+userName+'/'+repo+'/actions/secrets/public-key'
    console.log(url)
    await axios.get(url, {
        headers:{
            authorization: 'Bearer ' + token
        }
    })
    .then( (res) => {
        result = res.data
    } )
    .catch(err => {
        console.error(err.message)
    })
    return result
}

async function uploadSecret(
token, 
encrypted, 
secretId,
keyId,
userName,
repo,
){
    let result 
    const url = 'https://api.github.com/repos/'+userName+'/'+repo+'/actions/secrets/'+secretId
    await axios.put(url, {
        "encrypted_value": encrypted,
        "key_id": keyId
        
    }, {
        headers:{
            authorization: 'Bearer ' + token,
            "content-type": "application/json"
        }
    })
    .then( res => {
        result = res.status
    })
    .catch(err => {
        const response = err.response
        console.error(response.status, response.statusText)
        console.error(response.data)
    })
    return result

}

async function deleteSecret(
token, 
secretId,
userName,
repo,
){
    let result 
    const url = 'https://api.github.com/repos/'+userName+'/'+repo+'/actions/secrets/'+secretId
    await axios.delete(url, 
    {
        headers:{
            authorization: 'Bearer ' + token,
            "content-type": "application/json"
        }
    })
    .then( res => {
        result = res.status
    })
    .catch(err => {
        const response = err.response
        console.error(response.status, response.statusText)
        console.error(response.data)
    })
    return result
}

exports.module= {
    genEncryptedSecret: genEncryptedSecret,
    getPublicKey: getPublicKey,
    uploadSecret: uploadSecret,
    deleteSecret: deleteSecret,
}