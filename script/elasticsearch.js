const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });
// const getData = require('./getData.js');


const index = 'job-bank';
const type = 'job';
let allRecords = [];



module.exports.resetIndex = async (lang) => {
  const {body, statusCode, headers, warnings, meta} = await client.indices.exists({ index: index });

  try {
    if (body) {
      await client.indices.delete({index: index})
    }

    await client.indices.create({index: index})
  } catch err {
    console.log(`Error resetting index: ${err.message}`)
    // TODO: Figure out how to inform person sript broke.
    return false;
  }
  
}

module.exports.bulkSave = async (allRecords) => {
  try {
    await client.bulk({body: allRecords.english})
    await client.bulk({body: allRecords.french})
  } catch err {
    console.log(`Error saving in bulk: ${err.message}`)
    return false;
  }
}


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

  //TODO: add language handling when getting Data
  allRecords = await getData(client, index, type);

  //TODO: unhardcode the language
  await client.bulk({body: allRecords.english}).then( resp => {
    // console.log('bulk response',resp);
    respObject = resp;
  }, err => {
    console.log('bulk error',err.message);
    return err;
  });

  return respObject;
};

module.exports = resetIndex;
