const resetIndex = require('./script/resetIndex');

resetIndex();


let indexReset = await elasticsearch.resetIndex
if (indexReset === false) {
  process.exit(1)
}

// getData

// Bulk save 