const axios = require('axios');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });
const parseString = require('xml2js').parseString;

const index = 'job-bank';
const type = 'job';
const allRecords = [];

// console.log(client.info);

//TODO: don't forget french
async function getData () {
  const initialData = await axios.get('https://www.jobbank.gc.ca/xmlfeed/en/on', {
    headers: {
      Cookie: "[insert correct cookie]"
    },
    responseType: 'text'
  });

  let jsonData = {};

  parseString(initialData.data, function (err, result) {
    jsonData = result.SolrResponse.Documents[0].Document;
  });

  //TODO: limiting n of records for now but will need to be unlimited
  let tempDataSet = jsonData.slice(0, 4);
  // console.log(tempDataSet);

  //TODO: use filter
    for (var i = 0; i < tempDataSet.length; i++) {
      if (tempDataSet[i].hasOwnProperty('jobs_id')) {
        // console.log(i,tempDataSet[i].jobs_id);
        let jobUrl = 'https://www.jobbank.gc.ca/xmlfeed/en/' + tempDataSet[i].jobs_id[0] + '.xml';

        let indivRecord = await axios.get(jobUrl, {
          headers: {
            Cookie: "[insert correct cookie]"
          },
          responseType: 'text'
        });

        let jsonJobInfo = {};
        parseString(indivRecord.data, function (err, result) {
          jsonJobInfo = result.SolrResponse.Documents[0].Document[0];
        });
        // console.log('jsonJobInfo', jsonJobInfo);

        allRecords.push({ index: { _index: index, _type: type } });
        allRecords.push(jsonJobInfo);
      }
    }
  // });
}

async function checkConnection () {
  let isConnected = false;
  while (!isConnected) {
    console.log('Connecting to ES');
    try {
      const health = await client.cluster.health({});
      console.log(health);
      isConnected = true
    } catch (err) {
      console.log('Connection Failed, Retrying...', err)
    }
  }
}

/** Clear the index, recreate it, and add mappings */
async function resetIndex () {
  const {body, statusCode, headers, warnings, meta} = await client.indices.exists({ index: index });

  if (body) {
    await client.indices.delete({ index: index }).then(function (resp) {
      // console.log('delete response',resp);
    }, function (err) {
      console.log('delete error',err.message);
    });
  }

  await client.indices.create({ index: index }).then(function (resp) {
    // console.log('create response',resp);
  }, function (err) {
    console.log('create error',err.message);
  });
  // await putBookMapping()
  await getData();

  await client.bulk({body: allRecords}).then( resp => {
    // console.log('bulk response',resp);
  }, err => {
    console.log('bulk error',err.message);
  });

}

resetIndex();
