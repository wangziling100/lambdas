const sodium = require('tweetsodium');
const util = require('tweetnacl-util');
const axios = require('axios');
let bucketName, dynamo, s3, Auth, https
const debug = process.env.DEBUG || false

try{
    bucketName = process.env.BUCKET_NAME
    const AWS = require('aws-sdk');
    dynamo = new AWS.DynamoDB.DocumentClient({region: 'eu-central-1'})
    /*
    s3 = new AWS.S3()
    Auth = require('@octokit/auth')
    https = require('https')
    */
}
catch(err){
    if(debug) console.error(err.message)
}

exports.handler= async (event, context) =>{
    const body = JSON.parse(event.body)
    const inputs = checkInput(body)
    if (inputs===null) return setResponse(false)
    let {option, token, password, secrets, userName, repo} = inputs
    if(debug) console.log(option, token, password, secrets, userName, repo)
    try{
        token = await getToken(userName, password, token)
        switch (option){
            case 'create': {
                const keyInfo = await getPublicKey(token, userName, repo)
                const key = keyInfo.key 
                const keyId = keyInfo.key_id
                for (let index in secrets){
                    const encrypted = genEncryptedSecret(key, secrets[index])
                    const resp = await uploadSecret(token, encrypted, index, keyId, userName, repo)
                    if(resp!==204 && resp!==201) throw new Error('Upload failed')
                }
                break;
            }
            case 'delete': {
                for (let index in secrets){
                    const resp = await deleteSecret(token, index, userName, repo)
                    if(resp!==201 && resp!==204) throw new Error('Delete failed')
                }
                break;
            }
            default: return setResponse(false)
        }
    }
    catch(err){
        if(debug) console.error(err.message)
        return setResponse(false)
    }
    
    return setResponse(true)
}

function setResponse(succeed=true){
    if(succeed===false){
        return {
            'statusCode': 412,
            'body': JSON.stringify({
                message: 'Precondition Failed'
            })
        }
    }
    else{
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'OK'
            })
        }
    }
}

async function getToken(userName, password, token){
    if (token !== null || token !== undefined){
        await storeInDB(userName, password, token)
    }
    else{
        token = await getTokenFromDB(userName, password)
    }
    return token
}

async function storeInDB(userName, password, token){
    const params = {
        TableName: 'GithubToken',
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
        TableName: 'GithubToken',
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
        if(debug) console.log(err)
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
    await axios.get(url, {
        headers:{
            authorization: 'Bearer ' + token
        }
    })
    .then( (res) => {
        result = res.data
    } )
    .catch(err => {
        if(debug) console.error(err.message)
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
        if (debug) console.error(response.status, response.statusText)
        if (debug) console.error(response.data)
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
        if (debug) console.error(response.status, response.statusText)
        if (debug) console.error(response.data)
    })
    return result
}

function checkInput(body){
    try{
        const result = {
            option: body.option,
            token: body.token,
            password: body.password,
            secrets: body.secrets,
            userName: body.userName,
            repo: body.repo
        }
        const required = []
        required.push(result.option)
        required.push(result.secrets)
        required.push(result.userName)
        required.push(result.repo)
        if (result.password===undefined){
            required.push(result.token)
        }
        for (let el of required){
            if (el===undefined){
                throw "Required input is undefined."
            }
        }
        return result
    }    
    catch(err){
        if (debug) console.error(err)
        return null
    }
}

exports.module= {
    genEncryptedSecret: genEncryptedSecret,
    getPublicKey: getPublicKey,
    uploadSecret: uploadSecret,
    deleteSecret: deleteSecret,
    checkInput: checkInput,
    setResponse: setResponse,
}