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
    return await client.indices.refresh({ index });
  } catch (err) {
    console.log(`Error refreshing index: ${JSON.stringify(err, null, 2)}`)
  }
};

module.exports.searchQuery = async (keyword, index, size, from, sort) => {
  let searchQuery;
  if (keyword) {
    searchQuery = {
      multi_match: {
        query: keyword,
        fields: [
          "title",
          "city_name",
          "province_cd"
        ]
      },
    }
  } else {
    searchQuery = {
      match_all: {},
    }
  }

  try {
    return await client.search({
      index: index,
      body: {
          query: searchQuery,
          size: size,
          from: from,
          sort: [
            {"date_posted": {order: sort}}
          ]
        }
    })
  } catch (err) {
    // console.log(`Error performing search: ${err}`);
    console.log(`Error performing search: ${JSON.stringify(err, null, 2)}`);
    return false;
  }
};
