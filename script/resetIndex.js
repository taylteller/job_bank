const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });
const getData = require('./getData.js');


const index = 'job-bank';
const type = 'job';
let allRecords = [];


/** Clear the index, recreate it, and add mappings */
const resetIndex = async () => {
  let respObject = {};
  const {body, statusCode, headers, warnings, meta} = await client.indices.exists({ index: index });

  if (body) {
    await client.indices.delete({ index: index }).then( resp => {
      // console.log('delete response',resp);
    }, err => {
      console.log('delete error',err.message);
    });
  }

  await client.indices.create({ index: index }).then( resp => {
    // console.log('create response',resp);
  }, err => {
    console.log('create error',err.message);
  });
  // await putBookMapping()
  allRecords = await getData(client, index, type);

  await client.bulk({body: allRecords}).then( resp => {
    // console.log('bulk response',resp);
    respObject = resp;
  }, err => {
    console.log('bulk error',err.message);
    return err;
  });

  return respObject;
};

module.exports = resetIndex;
