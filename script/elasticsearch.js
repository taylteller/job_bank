const { Client } = require('@elastic/elasticsearch');
const mockES = require('../test/mock/elasticsearch.mock');

const client = !!+process.env.ES_MOCK ? new mockES.Client() :
  new Client({ node: process.env.ES_PORT || 'http://localhost:9200' });

module.exports.resetIndex = async (index) => {
let deconstructor = { body: undefined};

  try {
    deconstructor = await client.indices.exists({index: index});
  } catch (err) {
    console.error(`Error checking whether index exists: ${err.message}`);
  }

  try {
    if (deconstructor.body) {
      await client.indices.delete({index: index});
    }
    await client.indices.create({index: index});
  } catch (err) {
    console.error(`Error resetting index: ${err.message}`);
    return false;
  }
};

module.exports.bulkSave = async (allRecords, englishIndex, frenchIndex) => {
  //TODO: will need to make bulkSave take the index and be called twice in index
  // rather than taking a boolean for each index

  try {
    let response = {};
    if (englishIndex) {
      response.en = await client.bulk({body: allRecords.english});
    }
    if (frenchIndex) {
      response.fr = await client.bulk({body: allRecords.french});
    }
    return response;
  } catch (err) {
    console.log(`Error saving in bulk: ${err.message}`);
    return false;
  }
};
