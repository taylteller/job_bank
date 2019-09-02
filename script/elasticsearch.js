const {Client} = require('@elastic/elasticsearch');
const mockES = require('../test/mock/elasticsearch.mock');

const client = !!+process.env.ES_MOCK ? new mockES.Client() :
  new Client({node: process.env.ES_PORT || 'http://localhost:9200'});

module.exports.resetIndex = async (index) => {
  let deconstructor = {body: undefined};

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

module.exports.bulkSave = async (allRecords) => {
  try {
    return await client.bulk({body: allRecords});
  } catch (err) {
    console.log(`Error saving in bulk: ${err.message}`);
    return false;
  }
};

module.exports.refresh = async (index) => {
  try {
    return await client.indices.refresh({index});
  } catch (err) {
    console.log(`Error refreshing index: ${err.message}`);
  }
};

module.exports.searchQuery = async (index) => {
  try {
    return await client.search({
      _source: ['jobs_id', 'file_update_date'],
      index: index,
      body: {
        query: {
          match_all: {},
        },
      },
    });
  } catch (err) {
    console.log(`Error performing search: ${err.message}`);
    return false;
  }
};
